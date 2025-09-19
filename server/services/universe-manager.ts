import { ClaudePortfolioAnalysisService } from './claude';
import { investmentUniverseService } from './investment-universe';
import { db } from '../db';
import { InvestmentUniverseItem } from '../../shared/schema';
import fs from 'fs/promises';
import path from 'path';

/**
 * Investment Universe Manager
 * Verwaltet das Anlageuniversum und Factsheet-Daten
 * WICHTIG: Alle Analysen werden an Claude delegiert
 */
export class UniverseManager {
  private claudeService: ClaudePortfolioAnalysisService;
  private universeService: typeof investmentUniverseService;
  private universePath: string;

  constructor() {
    this.claudeService = ClaudePortfolioAnalysisService.getInstance();
    this.universeService = investmentUniverseService;
    this.universePath = path.join(process.cwd(), 'investment_universe');
  }

  /**
   * Validiert alle Instrumente eines Portfolios gegen das Investment Universe
   */
  async getFilteredUniverse(riskProfile: string, constraints?: any) {
    console.log(`[Universe-Manager] Getting filtered universe for ${riskProfile}`);

    try {
      // Delegiere Universe-Filterung an Claude
      const filteredUniverse = await this.claudeService.filterInvestmentUniverse({
        riskProfile,
        constraints: constraints || {},
        availableInstruments: await this.getAllInstruments()
      });

      return filteredUniverse;

    } catch (error) {
      console.error('[Universe-Manager] Universe filtering failed:', error);
      throw new Error(`Universe-Filterung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  async validatePortfolioInstruments(portfolio: any) {
    console.log('[Universe-Manager] Validating portfolio instruments');

    const validationResults = {
      totalInstruments: portfolio.positions.length,
      validatedInstruments: [] as any[],
      missingInstruments: [] as any[],
      needsFactsheetUpdate: [] as any[],
      instrumentData: {} as Record<string, any>
    };

    // Prüfe jedes Instrument
    for (const position of portfolio.positions) {
      const validation = await this.validateInstrument({
        name: position.instrumentName,
        isin: position.isin,
        value: position.marketValue
      });

      if (validation.isValid) {
        validationResults.validatedInstruments.push(validation);
        validationResults.instrumentData[position.isin || position.instrumentName] = validation.data;
      } else if (validation.needsUpdate) {
        validationResults.needsFactsheetUpdate.push(validation);
      } else {
        validationResults.missingInstruments.push(validation);
      }
    }

    // Wenn Instrumente fehlen, versuche sie zu finden
    if (validationResults.missingInstruments.length > 0) {
      const searchResults = await this.searchMissingInstruments(
        validationResults.missingInstruments
      );

      // Update validation results mit gefundenen Instrumenten
      for (const found of searchResults.found) {
        validationResults.instrumentData[found.isin] = found.data;
      }
    }

    return validationResults;
  }

  /**
   * Sucht und lädt Factsheets für ein Instrument
   */
  async loadFactsheetData(request: {
    isin?: string;
    name: string;
    assetClass?: string;
  }) {
    console.log(`[Universe-Manager] Loading factsheet for ${request.name}`);

    // Erst lokal suchen
    const localFactsheet = await this.findLocalFactsheet(request);

    if (localFactsheet) {
      // Delegiere Analyse an Claude
      const analysis = await this.claudeService.analyzeFactsheet({
        factsheetPath: localFactsheet.path,
        instrumentName: request.name,
        isin: request.isin
      });

      return {
        source: 'local',
        path: localFactsheet.path,
        analysis,
        lastUpdated: localFactsheet.modified
      };
    }

    // Wenn nicht lokal, online suchen über Claude
    const onlineFactsheet = await this.claudeService.searchFactsheetOnline({
      name: request.name,
      isin: request.isin,
      assetClass: request.assetClass
    });

    if (onlineFactsheet.found) {
      // Speichere für zukünftige Nutzung
      await this.saveFactsheet({
        data: onlineFactsheet.data,
        metadata: {
          name: request.name,
          isin: request.isin,
          assetClass: request.assetClass || 'Sonstiges',
          source: onlineFactsheet.source,
          downloadDate: new Date()
        }
      });

      return {
        source: 'online',
        analysis: onlineFactsheet.analysis,
        lastUpdated: new Date()
      };
    }

    return null;
  }

  /**
   * Aktualisiert das gesamte Investment Universe
   */
  async updateUniverse(options?: {
    fullRefresh?: boolean;
    categories?: string[];
    sinceDate?: Date;
  }) {
    console.log('[Universe-Manager] Starting universe update');

    const updateTasks = [];

    // Hole alle Kategorien
    const categories = options?.categories || await this.getAllCategories();

    for (const category of categories) {
      const task = this.updateCategory({
        category,
        fullRefresh: options?.fullRefresh || false,
        sinceDate: options?.sinceDate
      });
      updateTasks.push(task);
    }

    const results = await Promise.all(updateTasks);

    // Erstelle Zusammenfassung
    const summary = {
      totalCategories: categories.length,
      totalInstruments: results.reduce((sum, r) => sum + r.instrumentsProcessed, 0),
      updatedInstruments: results.reduce((sum, r) => sum + r.updated, 0),
      newInstruments: results.reduce((sum, r) => sum + r.new, 0),
      errors: results.filter(r => r.errors.length > 0).flatMap(r => r.errors)
    };

    // Delegiere an Claude für Analyse und Empfehlungen
    const recommendations = await this.claudeService.analyzeUniverseUpdate({
      summary,
      categoryResults: results
    });

    return {
      summary,
      recommendations,
      details: results
    };
  }

  /**
   * Fügt ein neues Instrument zum Universe hinzu
   */
  async addInstrumentToUniverse(request: {
    name: string;
    isin?: string;
    assetClass: string;
    category: string;
    factsheetUrl?: string;
    metadata?: Record<string, any>;
  }) {
    console.log(`[Universe-Manager] Adding ${request.name} to universe`);

    // Prüfe ob bereits vorhanden
    const existing = await this.findInstrument({
      isin: request.isin,
      name: request.name
    });

    if (existing) {
      return {
        success: false,
        error: 'Instrument bereits im Universe vorhanden',
        existing
      };
    }

    // Lade Factsheet wenn URL vorhanden
    let factsheetData = null;
    if (request.factsheetUrl) {
      factsheetData = await this.claudeService.downloadAndAnalyzeFactsheet({
        url: request.factsheetUrl,
        instrumentName: request.name,
        isin: request.isin
      });
    }

    // Erstelle Verzeichnisstruktur wenn nötig
    const targetPath = path.join(
      this.universePath,
      request.assetClass,
      request.category
    );

    await fs.mkdir(targetPath, { recursive: true });

    // Speichere Instrument
    const instrumentFile = path.join(
      targetPath,
      `${request.isin || request.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`
    );

    const instrumentData = {
      name: request.name,
      isin: request.isin,
      assetClass: request.assetClass,
      category: request.category,
      factsheetData,
      metadata: request.metadata,
      addedDate: new Date(),
      lastUpdated: new Date()
    };

    await fs.writeFile(
      instrumentFile,
      JSON.stringify(instrumentData, null, 2)
    );

    return {
      success: true,
      instrument: instrumentData,
      path: instrumentFile
    };
  }

  /**
   * Sucht optimale Alternativen für ein Instrument
   */
  async findAlternatives(request: {
    currentInstrument: {
      name: string;
      isin?: string;
      assetClass: string;
    };
    criteria: {
      similarRisk?: boolean;
      lowerCost?: boolean;
      betterPerformance?: boolean;
      improvedLiquidity?: boolean;
      specificFeatures?: string[];
    };
    maxResults?: number;
  }) {
    console.log(`[Universe-Manager] Finding alternatives for ${request.currentInstrument.name}`);

    // Hole alle Instrumente der gleichen Asset-Klasse
    const candidates = await this.getInstrumentsByAssetClass(
      request.currentInstrument.assetClass
    );

    // Delegiere Analyse und Ranking an Claude
    const alternatives = await this.claudeService.findBestAlternatives({
      currentInstrument: request.currentInstrument,
      candidates,
      criteria: request.criteria,
      maxResults: request.maxResults || 10
    });

    return {
      currentInstrument: request.currentInstrument,
      alternatives: alternatives.ranked,
      comparison: alternatives.comparison,
      recommendation: alternatives.topRecommendation
    };
  }

  // Private Hilfsmethoden
  private async validateInstrument(instrument: any) {
    // Suche im lokalen Universe
    const localData = await this.findInstrument({
      isin: instrument.isin,
      name: instrument.name
    });

    if (localData) {
      // Prüfe Aktualität
      const isOutdated = this.isDataOutdated(localData.lastUpdated);

      return {
        isValid: true,
        needsUpdate: isOutdated,
        data: localData,
        instrument
      };
    }

    return {
      isValid: false,
      needsUpdate: false,
      instrument
    };
  }

  private async findLocalFactsheet(request: any) {
    try {
      const searchPaths = [
        path.join(this.universePath, request.assetClass || '*', '**', `*${request.isin}*`),
        path.join(this.universePath, request.assetClass || '*', '**', `*${request.name.substring(0, 10)}*`)
      ];

      for (const searchPath of searchPaths) {
        // Implementierung der Suche
        // Placeholder - würde Glob verwenden
      }
    } catch (error) {
      console.error('[Universe-Manager] Error finding factsheet:', error);
      return null;
    }
  }

  private async searchMissingInstruments(missing: any[]) {
    const searchTasks = missing.map(instrument =>
      this.claudeService.identifyInstrument({
        name: instrument.instrument.name,
        value: instrument.instrument.value
      })
    );

    const results = await Promise.all(searchTasks);

    return {
      found: results.filter(r => r.identified),
      notFound: results.filter(r => !r.identified)
    };
  }

  private async findInstrument(params: { isin?: string; name: string }) {
    // Implementierung der Instrumentensuche
    try {
      const result = await this.universeService.searchInstruments({
        query: params.isin || params.name,
        limit: 1
      });

      return result.instruments[0] || null;
    } catch (error) {
      console.error('[Universe-Manager] Error finding instrument:', error);
      return null;
    }
  }

  private async getAllCategories(): Promise<string[]> {
    const universe = await this.universeService.getUniverse();
    return universe.categories;
  }

  private async updateCategory(params: any) {
    // Placeholder für Kategorie-Update
    return {
      category: params.category,
      instrumentsProcessed: 0,
      updated: 0,
      new: 0,
      errors: []
    };
  }

  private async saveFactsheet(params: any) {
    // Implementierung der Factsheet-Speicherung
    const targetPath = path.join(
      this.universePath,
      params.metadata.assetClass,
      'factsheets'
    );

    await fs.mkdir(targetPath, { recursive: true });

    const filename = `${params.metadata.isin || params.metadata.name.replace(/[^a-zA-Z0-9]/g, '_')}_factsheet.json`;
    const filepath = path.join(targetPath, filename);

    await fs.writeFile(filepath, JSON.stringify(params, null, 2));
  }

  private isDataOutdated(lastUpdated?: Date): boolean {
    if (!lastUpdated) return true;

    const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > 30; // Älter als 30 Tage
  }

  private async getInstrumentsByAssetClass(assetClass: string) {
    const universe = await this.universeService.getUniverse();
    return universe.instruments.filter(i => i.assetClass === assetClass);
  }

  private async getAllInstruments() {
    const universe = await this.universeService.getUniverse();
    return universe.instruments;
  }
}