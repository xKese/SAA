/**
 * Enhanced Fund Look-Through Analysis Service
 * Vollständige prozentuale Dekomposition von Fonds in zugrundeliegende Asset-Klassen, Regionen und Währungen
 */

import Anthropic from '@anthropic-ai/sdk';
import { UnderlyingHolding, LookThroughPositionResult, LookThroughAnalysisResult } from '../../shared/schema';
import { ErrorHandlingService } from './errorHandling';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || "",
});

export interface FundAllocationBreakdown {
  assetClasses: Record<string, number>;
  geographicRegions: Record<string, number>;
  currencies: Record<string, number>;
  sectors?: Record<string, number>;
  confidence: number;
  dataSource: 'factsheet' | 'estimated' | 'hybrid';
  warnings: string[];
}

export interface EnhancedUnderlyingHolding extends UnderlyingHolding {
  // Erweiterte Felder für detaillierte Analyse
  weight: number; // Gewichtung im ursprünglichen Fonds
  effectiveWeight: number; // Effektive Gewichtung im Gesamtportfolio
  currency: string;
  hedged?: boolean;
  maturity?: string; // Für Anleihen
  rating?: string; // Für Anleihen
  marketCap?: 'large' | 'mid' | 'small'; // Für Aktien
}

export interface CompleteFundAnalysis {
  fundName: string;
  fundIsin?: string;
  totalValue: number;
  allocationBreakdown: FundAllocationBreakdown;
  underlyingHoldings: EnhancedUnderlyingHolding[];
  lookThroughDepth: number;
  qualityMetrics: {
    dataCompleteness: number;
    sourceReliability: number;
    allocationAccuracy: number;
    overallScore: number;
  };
  processingTime: number;
  timestamp: string;
}

export class EnhancedFundLookThroughService {
  private static readonly MAX_LOOK_THROUGH_DEPTH = 3;
  private static readonly MIN_ALLOCATION_THRESHOLD = 0.005; // 0.5% minimum
  private static readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 Stunden

  private fundAnalysisCache = new Map<string, {
    data: CompleteFundAnalysis;
    timestamp: number;
  }>();

  /**
   * Vollständige Fonds-Look-Through-Analyse mit prozentualer Zuordnung
   */
  async performCompleteLookThrough(
    fundPositions: Array<{
      name: string;
      isin?: string;
      value: number;
      percentage: number;
    }>,
    portfolioTotalValue: number
  ): Promise<{
    fundAnalyses: CompleteFundAnalysis[];
    portfolioLevelBreakdown: {
      assetClasses: Record<string, number>;
      geographicRegions: Record<string, number>;
      currencies: Record<string, number>;
      sectors: Record<string, number>;
    };
    qualityReport: string;
    warnings: string[];
  }> {
    console.log('🔍 Starting Enhanced Fund Look-Through Analysis...');
    const startTime = Date.now();

    const fundAnalyses: CompleteFundAnalysis[] = [];
    const aggregatedBreakdown = {
      assetClasses: {} as Record<string, number>,
      geographicRegions: {} as Record<string, number>,
      currencies: {} as Record<string, number>,
      sectors: {} as Record<string, number>
    };
    const warnings: string[] = [];

    // Analysiere jeden Fonds einzeln
    for (const fund of fundPositions) {
      try {
        console.log(`Analyzing fund: ${fund.name} (${fund.percentage}% of portfolio)`);

        const analysis = await this.analyzeSingleFund(fund, portfolioTotalValue);
        fundAnalyses.push(analysis);

        // Aggregiere Ergebnisse auf Portfolio-Ebene
        this.aggregateToPortfolioLevel(
          analysis,
          fund.percentage / 100,
          aggregatedBreakdown
        );

        warnings.push(...analysis.allocationBreakdown.warnings);
      } catch (error) {
        console.error(`Error analyzing fund ${fund.name}:`, error);
        warnings.push(`Fehler bei Analyse von ${fund.name}: ${error.message}`);

        // Fallback-Analyse
        const fallbackAnalysis = await this.createFallbackAnalysis(fund);
        fundAnalyses.push(fallbackAnalysis);
      }
    }

    // Normalisiere Portfolio-Level-Allokationen auf 100%
    this.normalizePortfolioAllocations(aggregatedBreakdown);

    const processingTime = Date.now() - startTime;
    console.log(`Enhanced Look-Through completed in ${processingTime}ms`);

    return {
      fundAnalyses,
      portfolioLevelBreakdown: aggregatedBreakdown,
      qualityReport: this.generateQualityReport(fundAnalyses),
      warnings
    };
  }

  /**
   * Analysiere einen einzelnen Fonds vollständig
   */
  private async analyzeSingleFund(
    fund: { name: string; isin?: string; value: number; percentage: number },
    portfolioTotalValue: number
  ): Promise<CompleteFundAnalysis> {
    const startTime = Date.now();
    const cacheKey = `${fund.name}_${fund.isin || 'NO_ISIN'}`;

    // Prüfe Cache
    const cached = this.fundAnalysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log(`Using cached analysis for ${fund.name}`);
      return cached.data;
    }

    // Suche und analysiere Factsheet
    const factsheetContent = await this.findFactsheetContent(fund.name, fund.isin);

    let allocationBreakdown: FundAllocationBreakdown;
    let underlyingHoldings: EnhancedUnderlyingHolding[];

    if (factsheetContent) {
      // Claude AI-gesteuerte Factsheet-Analyse
      allocationBreakdown = await this.analyzeFactsheetWithClaude(factsheetContent, fund.name);
      underlyingHoldings = await this.extractDetailedHoldings(factsheetContent, fund.value);
    } else {
      // Fallback auf Schätzungen
      allocationBreakdown = await this.estimateAllocationBreakdown(fund.name);
      underlyingHoldings = await this.createEstimatedHoldings(fund);
    }

    // Berechne Qualitätsmetriken
    const qualityMetrics = this.calculateQualityMetrics(allocationBreakdown, underlyingHoldings);

    const analysis: CompleteFundAnalysis = {
      fundName: fund.name,
      fundIsin: fund.isin,
      totalValue: fund.value,
      allocationBreakdown,
      underlyingHoldings,
      lookThroughDepth: 1,
      qualityMetrics,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    // Cache das Ergebnis
    this.fundAnalysisCache.set(cacheKey, {
      data: analysis,
      timestamp: Date.now()
    });

    return analysis;
  }

  /**
   * Claude AI-gesteuerte Factsheet-Analyse für vollständige Allokationsaufschlüsselung
   */
  private async analyzeFactsheetWithClaude(
    factsheetContent: string,
    fundName: string
  ): Promise<FundAllocationBreakdown> {
    const prompt = `
Analysiere dieses Factsheet von "${fundName}" und extrahiere eine vollständige prozentuale Aufschlüsselung:

Factsheet Inhalt:
${factsheetContent.substring(0, 4000)}

Erstelle eine detaillierte JSON-Antwort mit folgender Struktur:
{
  "assetClasses": {
    "Aktien": 0.00,
    "Anleihen": 0.00,
    "Immobilien": 0.00,
    "Rohstoffe": 0.00,
    "Liquidität": 0.00,
    "Alternative": 0.00
  },
  "geographicRegions": {
    "USA/Nordamerika": 0.00,
    "Europa": 0.00,
    "Asien-Pazifik": 0.00,
    "Schwellenländer": 0.00,
    "Sonstige": 0.00
  },
  "currencies": {
    "USD": 0.00,
    "EUR": 0.00,
    "JPY": 0.00,
    "GBP": 0.00,
    "CHF": 0.00,
    "Sonstige": 0.00
  },
  "sectors": {
    "Technologie": 0.00,
    "Finanzen": 0.00,
    "Gesundheitswesen": 0.00,
    "Industrie": 0.00,
    "Konsumgüter": 0.00,
    "Sonstige": 0.00
  },
  "confidence": 0.95,
  "dataSource": "factsheet",
  "warnings": []
}

WICHTIGE REGELN:
1. Alle Prozentsätze als Dezimalzahlen (0.25 = 25%)
2. Jede Kategorie MUSS auf 1.00 (100%) summieren
3. Verwende deutsche Bezeichnungen
4. Confidence zwischen 0.0 und 1.0
5. Falls Daten unvollständig: confidence reduzieren und warnings hinzufügen
6. Nur JSON zurückgeben, keine zusätzlichen Erklärungen

Analysiere besonders:
- Asset Allocation Tabellen
- Geographic/Regional Breakdown
- Top Holdings und deren Klassifikation
- Currency Exposure
- Sector/Industry Allocation
- Hedging-Status falls vorhanden
`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response format from Claude');
      }

      // Parse JSON-Antwort
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Claude response');
      }

      const breakdown = JSON.parse(jsonMatch[0]) as FundAllocationBreakdown;

      // Validiere und normalisiere
      this.validateAndNormalizeBreakdown(breakdown);

      return breakdown;
    } catch (error) {
      console.error('Error in Claude factsheet analysis:', error);

      // Error Recovery durch ErrorHandlingService
      const recovery = await ErrorHandlingService.handleCalculationError(
        error as Error,
        1,
        'factsheet_analysis',
        { fundName, factsheetLength: factsheetContent.length }
      );

      if (recovery.success) {
        return recovery.data;
      }

      // Ultimate Fallback
      return this.createFallbackBreakdown(fundName);
    }
  }

  /**
   * Extrahiere detaillierte Holdings mit erweiterten Informationen
   */
  private async extractDetailedHoldings(
    factsheetContent: string,
    fundValue: number
  ): Promise<EnhancedUnderlyingHolding[]> {
    const prompt = `
Extrahiere die Top Holdings aus diesem Factsheet mit detaillierten Informationen:

${factsheetContent.substring(0, 3000)}

Erstelle JSON-Array mit folgender Struktur für jede Holding:
[
  {
    "instrumentName": "Name des Instruments",
    "isin": "ISIN falls verfügbar",
    "allocation": 0.05,
    "value": 50000,
    "instrumentType": "Aktien|Anleihen|Immobilien|Rohstoffe",
    "sector": "Sektor",
    "country": "Land",
    "currency": "USD",
    "weight": 0.05,
    "effectiveWeight": 0.05,
    "hedged": false,
    "dataSource": "factsheet",
    "confidence": 0.9,
    "marketCap": "large|mid|small",
    "rating": "AAA|AA|A|BBB|BB|B",
    "maturity": "2025-12-31"
  }
]

REGELN:
- Nur Holdings >1% Allokation
- allocation als Dezimalzahl
- value in EUR berechnet
- Deutsche Asset-Klassen verwenden
- Nur JSON, keine Erklärungen
`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        return [];
      }

      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const holdings = JSON.parse(jsonMatch[0]) as EnhancedUnderlyingHolding[];

      // Berechne Werte und validiere
      holdings.forEach(holding => {
        holding.value = fundValue * holding.allocation;
        holding.effectiveWeight = holding.weight || holding.allocation;
      });

      return holdings.filter(h => h.allocation >= this.MIN_ALLOCATION_THRESHOLD);
    } catch (error) {
      console.error('Error extracting detailed holdings:', error);
      return [];
    }
  }

  /**
   * Aggregiere Fonds-Ergebnisse auf Portfolio-Ebene
   */
  private aggregateToPortfolioLevel(
    fundAnalysis: CompleteFundAnalysis,
    fundWeightInPortfolio: number,
    aggregatedBreakdown: {
      assetClasses: Record<string, number>;
      geographicRegions: Record<string, number>;
      currencies: Record<string, number>;
      sectors: Record<string, number>;
    }
  ): void {
    // Asset-Klassen
    Object.entries(fundAnalysis.allocationBreakdown.assetClasses).forEach(([asset, allocation]) => {
      const portfolioAllocation = allocation * fundWeightInPortfolio;
      aggregatedBreakdown.assetClasses[asset] =
        (aggregatedBreakdown.assetClasses[asset] || 0) + portfolioAllocation;
    });

    // Geografische Regionen
    Object.entries(fundAnalysis.allocationBreakdown.geographicRegions).forEach(([region, allocation]) => {
      const portfolioAllocation = allocation * fundWeightInPortfolio;
      aggregatedBreakdown.geographicRegions[region] =
        (aggregatedBreakdown.geographicRegions[region] || 0) + portfolioAllocation;
    });

    // Währungen
    Object.entries(fundAnalysis.allocationBreakdown.currencies).forEach(([currency, allocation]) => {
      const portfolioAllocation = allocation * fundWeightInPortfolio;
      aggregatedBreakdown.currencies[currency] =
        (aggregatedBreakdown.currencies[currency] || 0) + portfolioAllocation;
    });

    // Sektoren
    if (fundAnalysis.allocationBreakdown.sectors) {
      Object.entries(fundAnalysis.allocationBreakdown.sectors).forEach(([sector, allocation]) => {
        const portfolioAllocation = allocation * fundWeightInPortfolio;
        aggregatedBreakdown.sectors[sector] =
          (aggregatedBreakdown.sectors[sector] || 0) + portfolioAllocation;
      });
    }
  }

  /**
   * Validiere und normalisiere Breakdown-Daten
   */
  private validateAndNormalizeBreakdown(breakdown: FundAllocationBreakdown): void {
    // Prüfe Asset-Klassen-Summierung
    const assetSum = Object.values(breakdown.assetClasses).reduce((sum, val) => sum + val, 0);
    if (Math.abs(assetSum - 1.0) > 0.01) {
      console.warn(`Asset allocation sum: ${assetSum}, normalizing...`);
      this.normalizeObject(breakdown.assetClasses);
    }

    // Prüfe geografische Allokationen
    const geoSum = Object.values(breakdown.geographicRegions).reduce((sum, val) => sum + val, 0);
    if (Math.abs(geoSum - 1.0) > 0.01) {
      console.warn(`Geographic allocation sum: ${geoSum}, normalizing...`);
      this.normalizeObject(breakdown.geographicRegions);
    }

    // Prüfe Währungsallokationen
    const currencySum = Object.values(breakdown.currencies).reduce((sum, val) => sum + val, 0);
    if (Math.abs(currencySum - 1.0) > 0.01) {
      console.warn(`Currency allocation sum: ${currencySum}, normalizing...`);
      this.normalizeObject(breakdown.currencies);
    }
  }

  /**
   * Normalisiere Object-Werte auf Summe 1.0
   */
  private normalizeObject(obj: Record<string, number>): void {
    const sum = Object.values(obj).reduce((total, val) => total + val, 0);
    if (sum > 0) {
      Object.keys(obj).forEach(key => {
        obj[key] = obj[key] / sum;
      });
    }
  }

  /**
   * Normalisiere Portfolio-Level-Allokationen
   */
  private normalizePortfolioAllocations(aggregatedBreakdown: {
    assetClasses: Record<string, number>;
    geographicRegions: Record<string, number>;
    currencies: Record<string, number>;
    sectors: Record<string, number>;
  }): void {
    this.normalizeObject(aggregatedBreakdown.assetClasses);
    this.normalizeObject(aggregatedBreakdown.geographicRegions);
    this.normalizeObject(aggregatedBreakdown.currencies);
    this.normalizeObject(aggregatedBreakdown.sectors);
  }

  /**
   * Berechne Qualitätsmetriken
   */
  private calculateQualityMetrics(
    breakdown: FundAllocationBreakdown,
    holdings: EnhancedUnderlyingHolding[]
  ): CompleteFundAnalysis['qualityMetrics'] {
    const dataCompleteness = breakdown.dataSource === 'factsheet' ? 0.9 : 0.4;
    const sourceReliability = breakdown.confidence;

    const holdingsSum = holdings.reduce((sum, h) => sum + h.allocation, 0);
    const allocationAccuracy = Math.max(0, 1 - Math.abs(1 - holdingsSum));

    const overallScore = (dataCompleteness + sourceReliability + allocationAccuracy) / 3;

    return {
      dataCompleteness,
      sourceReliability,
      allocationAccuracy,
      overallScore
    };
  }

  /**
   * Generiere Qualitätsbericht
   */
  private generateQualityReport(analyses: CompleteFundAnalysis[]): string {
    let report = '# Fund Look-Through Quality Report\n\n';

    const avgQuality = analyses.reduce((sum, a) => sum + a.qualityMetrics.overallScore, 0) / analyses.length;
    report += `**Durchschnittliche Qualität:** ${(avgQuality * 100).toFixed(1)}%\n\n`;

    report += '## Fonds-Details:\n';
    analyses.forEach(analysis => {
      const quality = analysis.qualityMetrics.overallScore;
      const status = quality > 0.8 ? '✅' : quality > 0.6 ? '⚠️' : '❌';

      report += `${status} **${analysis.fundName}**\n`;
      report += `- Qualität: ${(quality * 100).toFixed(1)}%\n`;
      report += `- Datenquelle: ${analysis.allocationBreakdown.dataSource}\n`;
      report += `- Holdings: ${analysis.underlyingHoldings.length}\n`;
      if (analysis.allocationBreakdown.warnings.length > 0) {
        report += `- Warnungen: ${analysis.allocationBreakdown.warnings.join(', ')}\n`;
      }
      report += '\n';
    });

    return report;
  }

  /**
   * Fallback-Methoden
   */
  private async findFactsheetContent(fundName: string, isin?: string): Promise<string | null> {
    // Implementierung der Factsheet-Suche (vereinfacht)
    console.log(`Searching factsheet for ${fundName}`);
    // Hier würde die tatsächliche Factsheet-Suche stattfinden
    return null; // Placeholder
  }

  private async estimateAllocationBreakdown(fundName: string): Promise<FundAllocationBreakdown> {
    // Fallback-Schätzungen basierend auf Fondsname
    return this.createFallbackBreakdown(fundName);
  }

  private createFallbackBreakdown(fundName: string): FundAllocationBreakdown {
    const name = fundName.toLowerCase();

    // Einfache heuristische Schätzungen
    if (name.includes('equity') || name.includes('stock') || name.includes('aktien')) {
      return {
        assetClasses: { Aktien: 0.95, Liquidität: 0.05 },
        geographicRegions: { 'USA/Nordamerika': 0.4, Europa: 0.35, 'Asien-Pazifik': 0.15, Schwellenländer: 0.1 },
        currencies: { USD: 0.4, EUR: 0.35, Sonstige: 0.25 },
        confidence: 0.3,
        dataSource: 'estimated',
        warnings: ['Schätzung basierend auf Fondsname - Factsheet nicht verfügbar']
      };
    }

    // Standard-Fallback für gemischte Fonds
    return {
      assetClasses: { Aktien: 0.6, Anleihen: 0.35, Liquidität: 0.05 },
      geographicRegions: { Europa: 0.5, 'USA/Nordamerika': 0.3, Sonstige: 0.2 },
      currencies: { EUR: 0.6, USD: 0.3, Sonstige: 0.1 },
      confidence: 0.2,
      dataSource: 'estimated',
      warnings: ['Vollständige Schätzung - keine Datenquellen verfügbar']
    };
  }

  private async createEstimatedHoldings(fund: { name: string; value: number }): Promise<EnhancedUnderlyingHolding[]> {
    return [{
      instrumentName: fund.name,
      allocation: 1.0,
      value: fund.value,
      instrumentType: 'Mischfonds',
      weight: 1.0,
      effectiveWeight: 1.0,
      currency: 'EUR',
      dataSource: 'estimated',
      confidence: 0.2
    }];
  }

  private async createFallbackAnalysis(fund: { name: string; value: number; percentage: number }): Promise<CompleteFundAnalysis> {
    return {
      fundName: fund.name,
      totalValue: fund.value,
      allocationBreakdown: this.createFallbackBreakdown(fund.name),
      underlyingHoldings: await this.createEstimatedHoldings(fund),
      lookThroughDepth: 0,
      qualityMetrics: {
        dataCompleteness: 0.1,
        sourceReliability: 0.1,
        allocationAccuracy: 0.1,
        overallScore: 0.1
      },
      processingTime: 0,
      timestamp: new Date().toISOString()
    };
  }
}