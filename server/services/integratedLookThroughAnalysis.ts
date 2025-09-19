/**
 * Integrated Look-Through Analysis
 * Integration der vollständigen Fund Look-Through Analyse mit der bestehenden 5-Phasen-Analyse
 */

import { PortfolioLookThroughIntegrator, LookThroughPortfolioAnalysis, PortfolioPosition } from './portfolioLookThroughIntegrator';
import { GermanLookThroughComplianceService, GermanComplianceReport } from './germanLookThroughCompliance';
import { LookThroughCacheManager } from './lookThroughCacheManager';
import { GermanTableFormatter } from './germanTableFormatter';
import { PortfolioAnalysisIntegration } from './portfolioAnalysisIntegration';

export interface IntegratedAnalysisRequest {
  portfolioId: string;
  positions: Array<{
    name: string;
    isin?: string;
    value: number;
    percentage: number;
    instrumentType: string;
    classification?: string;
  }>;
  requestedPhases: number[];
  includeLookThrough: boolean;
  complianceFramework?: 'BaFin' | 'KAGB' | 'MiFID_II';
}

export interface IntegratedAnalysisResult {
  portfolioId: string;
  timestamp: string;
  totalValue: number;

  // Bestehende 5-Phasen-Analyse
  phaseResults: {
    phase0?: any; // Instrumentenidentifikation
    phase1?: any; // Portfolio-Grundlagen
    phase2?: any; // Asset-Allokation
    phase3?: any; // Geografische Allokation
    phase4?: any; // Währungsexposure
    phase5?: any; // Risikometriken
  };

  // Erweiterte Look-Through-Analyse
  lookThroughAnalysis?: LookThroughPortfolioAnalysis;

  // Compliance-Bericht
  complianceReport?: GermanComplianceReport;

  // Integrierte Ergebnisse
  consolidatedAllocations: {
    assetClasses: Record<string, {
      percentage: number;
      value: number;
      traditionalAnalysis: number;
      lookThroughAnalysis: number;
      variance: number;
    }>;
    geographicRegions: Record<string, {
      percentage: number;
      value: number;
      traditionalAnalysis: number;
      lookThroughAnalysis: number;
      variance: number;
    }>;
    currencies: Record<string, {
      percentage: number;
      value: number;
      traditionalAnalysis: number;
      lookThroughAnalysis: number;
      variance: number;
    }>;
  };

  // Deutsche Formatierte Tabellen
  germanTables: {
    traditional: string;
    lookThrough: string;
    comparison: string;
  };

  // Qualitäts- und Performance-Metriken
  qualityMetrics: {
    lookThroughCoverage: number;
    dataQuality: number;
    complianceScore: number;
    analysisAccuracy: number;
  };

  performanceMetrics: {
    totalDuration: number;
    phaseDurations: Record<string, number>;
    cacheEfficiency: number;
    errorRecoveryCount: number;
  };

  recommendations: string[];
  warnings: string[];
}

export class IntegratedLookThroughAnalysisService {
  private portfolioIntegrator: PortfolioLookThroughIntegrator;
  private complianceService: GermanLookThroughComplianceService;
  private cacheManager: LookThroughCacheManager;

  constructor() {
    this.portfolioIntegrator = new PortfolioLookThroughIntegrator();
    this.complianceService = new GermanLookThroughComplianceService();
    this.cacheManager = new LookThroughCacheManager();
  }

  /**
   * Hauptanalyse-Methode: Integrierte Look-Through-Analyse
   */
  async performIntegratedAnalysis(
    request: IntegratedAnalysisRequest
  ): Promise<IntegratedAnalysisResult> {
    const analysisId = `${request.portfolioId}_${Date.now()}`;
    console.log(`🚀 Starting integrated look-through analysis: ${analysisId}`);

    // Performance-Monitoring starten
    this.cacheManager.startPerformanceMonitoring(analysisId);
    const startTime = Date.now();

    try {
      // Schritt 1: Portfolio-Positionen normalisieren
      const normalizedPositions = this.normalizePositions(request.positions);

      // Schritt 2: Look-Through-Analyse (falls angefordert)
      let lookThroughAnalysis: LookThroughPortfolioAnalysis | undefined;
      if (request.includeLookThrough) {
        console.log('📊 Performing look-through analysis...');
        const lookThroughStart = Date.now();

        lookThroughAnalysis = await this.cacheManager.getCachedPortfolioAnalysis(
          request.portfolioId,
          () => this.portfolioIntegrator.performIntegratedLookThroughAnalysis(
            request.portfolioId,
            normalizedPositions
          )
        );

        console.log(`✅ Look-through completed in ${Date.now() - lookThroughStart}ms`);
      }

      // Schritt 3: Traditionelle 5-Phasen-Analyse
      const phaseResults = await this.performTraditionalAnalysis(request);

      // Schritt 4: Compliance-Prüfung
      let complianceReport: GermanComplianceReport | undefined;
      if (lookThroughAnalysis && request.complianceFramework) {
        console.log('📋 Performing compliance check...');
        complianceReport = await this.complianceService.performGermanComplianceCheck(
          lookThroughAnalysis,
          request.complianceFramework
        );
      }

      // Schritt 5: Konsolidierung der Allokationen
      const consolidatedAllocations = this.consolidateAllocations(
        phaseResults,
        lookThroughAnalysis
      );

      // Schritt 6: Deutsche Tabellen erstellen
      const germanTables = await this.createComprehensiveGermanTables(
        phaseResults,
        lookThroughAnalysis,
        consolidatedAllocations
      );

      // Schritt 7: Qualitäts- und Performance-Metriken
      const qualityMetrics = this.calculateQualityMetrics(phaseResults, lookThroughAnalysis);
      const performanceMetrics = this.calculatePerformanceMetrics(analysisId, startTime);

      // Schritt 8: Empfehlungen und Warnungen
      const { recommendations, warnings } = this.generateInsights(
        phaseResults,
        lookThroughAnalysis,
        complianceReport,
        consolidatedAllocations
      );

      const totalDuration = Date.now() - startTime;
      console.log(`🎉 Integrated analysis completed in ${totalDuration}ms`);

      return {
        portfolioId: request.portfolioId,
        timestamp: new Date().toISOString(),
        totalValue: normalizedPositions.reduce((sum, p) => sum + p.value, 0),
        phaseResults,
        lookThroughAnalysis,
        complianceReport,
        consolidatedAllocations,
        germanTables,
        qualityMetrics,
        performanceMetrics: {
          ...performanceMetrics,
          totalDuration
        },
        recommendations,
        warnings
      };

    } catch (error) {
      console.error(`❌ Integrated analysis failed for ${analysisId}:`, error);
      throw new Error(`Integrated analysis failed: ${error.message}`);
    }
  }

  /**
   * Normalisiere Portfolio-Positionen
   */
  private normalizePositions(positions: any[]): PortfolioPosition[] {
    return positions.map(pos => ({
      name: pos.name,
      isin: pos.isin,
      value: pos.value,
      percentage: pos.percentage,
      instrumentType: this.normalizeInstrumentType(pos.instrumentType),
      classification: pos.classification
    }));
  }

  private normalizeInstrumentType(type: string): 'fund' | 'etf' | 'stock' | 'bond' | 'cash' | 'other' {
    const typeMap: Record<string, 'fund' | 'etf' | 'stock' | 'bond' | 'cash' | 'other'> = {
      'fonds': 'fund',
      'fund': 'fund',
      'etf': 'etf',
      'aktien': 'stock',
      'equity': 'stock',
      'stock': 'stock',
      'anleihen': 'bond',
      'bond': 'bond',
      'cash': 'cash',
      'liquidität': 'cash',
      'liquidity': 'cash'
    };

    return typeMap[type.toLowerCase()] || 'other';
  }

  /**
   * Führe traditionelle 5-Phasen-Analyse durch (vereinfacht für Integration)
   */
  private async performTraditionalAnalysis(request: IntegratedAnalysisRequest): Promise<any> {
    // Hier würde die bestehende ClaudeService-Analyse aufgerufen werden
    // Für die Integration implementieren wir eine vereinfachte Version

    const phaseResults: any = {};

    if (request.requestedPhases.includes(0)) {
      phaseResults.phase0 = await this.performPhase0(request.positions);
    }

    if (request.requestedPhases.includes(2)) {
      phaseResults.phase2 = await this.performPhase2(request.positions);
    }

    if (request.requestedPhases.includes(3)) {
      phaseResults.phase3 = await this.performPhase3(request.positions);
    }

    if (request.requestedPhases.includes(4)) {
      phaseResults.phase4 = await this.performPhase4(request.positions);
    }

    return phaseResults;
  }

  /**
   * Vereinfachte Implementierung der Phasen (Platzhalter)
   */
  private async performPhase0(positions: any[]): Promise<any> {
    // Instrumentenidentifikation
    return {
      identifiedInstruments: positions.length,
      fundCount: positions.filter(p => p.instrumentType === 'fund').length,
      directHoldingsCount: positions.filter(p => p.instrumentType !== 'fund').length
    };
  }

  private async performPhase2(positions: any[]): Promise<any> {
    // Asset-Allokation (vereinfacht)
    const assetAllocation: Record<string, number> = {};

    positions.forEach(pos => {
      const assetClass = this.mapToAssetClass(pos.instrumentType);
      assetAllocation[assetClass] = (assetAllocation[assetClass] || 0) + pos.percentage;
    });

    return { assetAllocation };
  }

  private async performPhase3(positions: any[]): Promise<any> {
    // Geografische Allokation (vereinfacht)
    const geographicAllocation: Record<string, number> = {};

    positions.forEach(pos => {
      const region = this.getRegionFromISIN(pos.isin);
      geographicAllocation[region] = (geographicAllocation[region] || 0) + pos.percentage;
    });

    return { geographicAllocation };
  }

  private async performPhase4(positions: any[]): Promise<any> {
    // Währungsexposure (vereinfacht)
    const currencyExposure: Record<string, number> = {};

    positions.forEach(pos => {
      const currency = this.getCurrencyFromISIN(pos.isin);
      currencyExposure[currency] = (currencyExposure[currency] || 0) + pos.percentage;
    });

    return { currencyExposure };
  }

  /**
   * Konsolidiere Allokationen aus traditioneller und Look-Through-Analyse
   */
  private consolidateAllocations(
    phaseResults: any,
    lookThroughAnalysis?: LookThroughPortfolioAnalysis
  ): IntegratedAnalysisResult['consolidatedAllocations'] {
    const consolidatedAllocations: IntegratedAnalysisResult['consolidatedAllocations'] = {
      assetClasses: {},
      geographicRegions: {},
      currencies: {}
    };

    // Asset-Klassen konsolidieren
    if (phaseResults.phase2?.assetAllocation) {
      Object.entries(phaseResults.phase2.assetAllocation).forEach(([asset, percentage]: [string, any]) => {
        const lookThroughPercentage = lookThroughAnalysis?.integratedAllocations.assetClasses[asset]?.percentage || 0;
        const variance = Math.abs(percentage - lookThroughPercentage);

        consolidatedAllocations.assetClasses[asset] = {
          percentage: lookThroughAnalysis ? lookThroughPercentage : percentage,
          value: 0, // Wird später berechnet
          traditionalAnalysis: percentage,
          lookThroughAnalysis: lookThroughPercentage,
          variance
        };
      });
    }

    // Geografische Regionen konsolidieren
    if (phaseResults.phase3?.geographicAllocation) {
      Object.entries(phaseResults.phase3.geographicAllocation).forEach(([region, percentage]: [string, any]) => {
        const lookThroughPercentage = lookThroughAnalysis?.integratedAllocations.geographicRegions[region]?.percentage || 0;
        const variance = Math.abs(percentage - lookThroughPercentage);

        consolidatedAllocations.geographicRegions[region] = {
          percentage: lookThroughAnalysis ? lookThroughPercentage : percentage,
          value: 0,
          traditionalAnalysis: percentage,
          lookThroughAnalysis: lookThroughPercentage,
          variance
        };
      });
    }

    // Währungen konsolidieren
    if (phaseResults.phase4?.currencyExposure) {
      Object.entries(phaseResults.phase4.currencyExposure).forEach(([currency, percentage]: [string, any]) => {
        const lookThroughPercentage = lookThroughAnalysis?.integratedAllocations.currencies[currency]?.percentage || 0;
        const variance = Math.abs(percentage - lookThroughPercentage);

        consolidatedAllocations.currencies[currency] = {
          percentage: lookThroughAnalysis ? lookThroughPercentage : percentage,
          value: 0,
          traditionalAnalysis: percentage,
          lookThroughAnalysis: lookThroughPercentage,
          variance
        };
      });
    }

    return consolidatedAllocations;
  }

  /**
   * Erstelle umfassende deutsche Tabellen
   */
  private async createComprehensiveGermanTables(
    phaseResults: any,
    lookThroughAnalysis?: LookThroughPortfolioAnalysis,
    consolidatedAllocations?: any
  ): Promise<IntegratedAnalysisResult['germanTables']> {
    let traditional = '';
    let lookThrough = '';
    let comparison = '';

    // Traditionelle Tabellen
    if (phaseResults.phase2 || phaseResults.phase3 || phaseResults.phase4) {
      const traditionalAllocations = this.convertToGermanTableFormat(phaseResults);
      traditional = await this.formatTraditionalTables(traditionalAllocations);
    }

    // Look-Through-Tabellen
    if (lookThroughAnalysis) {
      lookThrough = await this.formatLookThroughTables(lookThroughAnalysis);
    }

    // Vergleichstabelle
    if (consolidatedAllocations) {
      comparison = await this.formatComparisonTables(consolidatedAllocations);
    }

    return { traditional, lookThrough, comparison };
  }

  /**
   * Hilfsmethoden
   */
  private mapToAssetClass(instrumentType: string): string {
    const mapping: Record<string, string> = {
      'fund': 'Mischfonds',
      'etf': 'ETF',
      'stock': 'Aktien',
      'bond': 'Anleihen',
      'cash': 'Liquidität'
    };
    return mapping[instrumentType] || 'Sonstige';
  }

  private getRegionFromISIN(isin?: string): string {
    if (!isin) return 'Unbekannt';
    const countryCode = isin.substring(0, 2);
    const mapping: Record<string, string> = {
      'US': 'USA/Nordamerika',
      'DE': 'Deutschland',
      'FR': 'Europa',
      'GB': 'Europa',
      'JP': 'Asien-Pazifik'
    };
    return mapping[countryCode] || 'Sonstige';
  }

  private getCurrencyFromISIN(isin?: string): string {
    if (!isin) return 'EUR';
    const countryCode = isin.substring(0, 2);
    const mapping: Record<string, string> = {
      'US': 'USD',
      'DE': 'EUR',
      'FR': 'EUR',
      'GB': 'GBP',
      'JP': 'JPY'
    };
    return mapping[countryCode] || 'EUR';
  }

  private convertToGermanTableFormat(phaseResults: any): any {
    // Konvertierung der Phasenergebnisse in German Table Format
    return {
      assetAllocations: Object.entries(phaseResults.phase2?.assetAllocation || {})
        .map(([category, percentage]: [string, any]) => ({ category, percentage, value: 0 })),
      currencyExposures: Object.entries(phaseResults.phase4?.currencyExposure || {})
        .map(([currency, percentage]: [string, any]) => ({ currency, percentage, value: 0 })),
      geographicAllocations: Object.entries(phaseResults.phase3?.geographicAllocation || {})
        .map(([region, percentage]: [string, any]) => ({ region, percentage }))
    };
  }

  private async formatTraditionalTables(allocations: any): Promise<string> {
    // Vereinfachte Implementierung
    return 'Traditionelle Analyse Tabellen (vereinfacht implementiert)';
  }

  private async formatLookThroughTables(analysis: LookThroughPortfolioAnalysis): Promise<string> {
    // Verwende die German Compliance Tables
    return Object.values(analysis.integratedAllocations).map(allocation =>
      JSON.stringify(allocation, null, 2)
    ).join('\n\n');
  }

  private async formatComparisonTables(consolidatedAllocations: any): Promise<string> {
    let comparison = '# Vergleich: Traditionelle vs. Look-Through Analyse\n\n';

    // Asset-Klassen-Vergleich
    comparison += '## Asset-Klassen\n\n';
    comparison += '| Asset-Klasse | Traditionell | Look-Through | Varianz |\n';
    comparison += '|-------------|-------------|-------------|----------|\n';

    Object.entries(consolidatedAllocations.assetClasses).forEach(([asset, data]: [string, any]) => {
      comparison += `| ${asset} | ${data.traditionalAnalysis.toFixed(1)}% | ${data.lookThroughAnalysis.toFixed(1)}% | ${data.variance.toFixed(1)}% |\n`;
    });

    return comparison;
  }

  private calculateQualityMetrics(phaseResults: any, lookThroughAnalysis?: LookThroughPortfolioAnalysis): IntegratedAnalysisResult['qualityMetrics'] {
    return {
      lookThroughCoverage: lookThroughAnalysis?.qualityMetrics.overallLookThroughCoverage || 0,
      dataQuality: lookThroughAnalysis?.qualityMetrics.averageDataQuality || 0.5,
      complianceScore: lookThroughAnalysis?.qualityMetrics.complianceScore || 0.5,
      analysisAccuracy: 0.8 // Placeholder
    };
  }

  private calculatePerformanceMetrics(analysisId: string, startTime: number): any {
    const metrics = this.cacheManager.endPerformanceMonitoring(analysisId, 0);
    const cacheStats = this.cacheManager.getCacheStats();

    const avgHitRate = Object.values(cacheStats).reduce((sum, stat) => sum + stat.hitRate, 0) / Object.keys(cacheStats).length;

    return {
      phaseDurations: {},
      cacheEfficiency: avgHitRate,
      errorRecoveryCount: 0
    };
  }

  private generateInsights(
    phaseResults: any,
    lookThroughAnalysis?: LookThroughPortfolioAnalysis,
    complianceReport?: GermanComplianceReport,
    consolidatedAllocations?: any
  ): { recommendations: string[]; warnings: string[] } {
    const recommendations: string[] = [];
    const warnings: string[] = [];

    // Look-Through-spezifische Insights
    if (lookThroughAnalysis) {
      if (lookThroughAnalysis.qualityMetrics.overallLookThroughCoverage < 0.8) {
        warnings.push('Look-Through-Abdeckung unter 80% - Detailliertere Fund-Analyse empfohlen');
      }

      recommendations.push(...lookThroughAnalysis.recommendations);
      warnings.push(...lookThroughAnalysis.warnings);
    }

    // Compliance-spezifische Insights
    if (complianceReport) {
      if (complianceReport.overallComplianceStatus !== 'compliant') {
        warnings.push(`Compliance-Status: ${complianceReport.overallComplianceStatus}`);
      }
      recommendations.push(...complianceReport.recommendations);
    }

    // Varianz-Analyse
    if (consolidatedAllocations) {
      Object.entries(consolidatedAllocations.assetClasses).forEach(([asset, data]: [string, any]) => {
        if (data.variance > 10) {
          warnings.push(`Hohe Varianz in ${asset}: ${data.variance.toFixed(1)}% zwischen traditioneller und Look-Through-Analyse`);
        }
      });
    }

    return { recommendations, warnings };
  }
}