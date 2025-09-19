/**
 * Portfolio Look-Through Integrator
 * Integriert Fund-Look-Through-Ergebnisse prozentual in die Portfolio-Analyse
 */

import { EnhancedFundLookThroughService, CompleteFundAnalysis } from './enhancedFundLookThrough';
import { ClaudeFactsheetAnalyzer, FactsheetAnalysisResult } from './claudeFactsheetAnalyzer';
import { GermanTableFormatter } from './germanTableFormatter';
import { MathematicalValidator } from './mathematicalValidation';

export interface PortfolioPosition {
  name: string;
  isin?: string;
  value: number;
  percentage: number;
  instrumentType: 'fund' | 'etf' | 'stock' | 'bond' | 'cash' | 'other';
  classification?: string;
}

export interface LookThroughPortfolioAnalysis {
  portfolioId: string;
  totalValue: number;
  timestamp: string;

  // Original Portfolio-Positionen
  originalPositions: PortfolioPosition[];

  // Fund Look-Through Ergebnisse
  fundAnalyses: CompleteFundAnalysis[];

  // Integrierte Portfolio-Level Allokationen
  integratedAllocations: {
    assetClasses: Record<string, {
      percentage: number;
      value: number;
      sources: Array<{
        sourceName: string;
        sourceType: 'fund' | 'direct';
        contribution: number;
      }>;
    }>;

    geographicRegions: Record<string, {
      percentage: number;
      value: number;
      sources: Array<{
        sourceName: string;
        sourceType: 'fund' | 'direct';
        contribution: number;
      }>;
    }>;

    currencies: Record<string, {
      percentage: number;
      value: number;
      hedged?: number;
      unhedged?: number;
      sources: Array<{
        sourceName: string;
        sourceType: 'fund' | 'direct';
        contribution: number;
      }>;
    }>;

    sectors?: Record<string, {
      percentage: number;
      value: number;
      sources: Array<{
        sourceName: string;
        sourceType: 'fund' | 'direct';
        contribution: number;
      }>;
    }>;
  };

  // Qualität und Compliance
  qualityMetrics: {
    overallLookThroughCoverage: number; // Prozent des Portfolios mit Look-Through
    averageDataQuality: number;
    mathematicalConsistency: number;
    complianceScore: number;
  };

  // Detaillierte Aufschlüsselung
  detailedBreakdown: {
    directHoldings: PortfolioPosition[];
    fundHoldings: Array<{
      fundName: string;
      fundPercentage: number;
      underlyingBreakdown: {
        assetClasses: Record<string, number>;
        regions: Record<string, number>;
        currencies: Record<string, number>;
      };
    }>;
  };

  warnings: string[];
  recommendations: string[];
}

export class PortfolioLookThroughIntegrator {
  private fundLookThroughService: EnhancedFundLookThroughService;
  private factsheetAnalyzer: ClaudeFactsheetAnalyzer;

  constructor() {
    this.fundLookThroughService = new EnhancedFundLookThroughService();
    this.factsheetAnalyzer = new ClaudeFactsheetAnalyzer();
  }

  /**
   * Hauptmethode: Vollständige Look-Through-Integration
   */
  async performIntegratedLookThroughAnalysis(
    portfolioId: string,
    positions: PortfolioPosition[]
  ): Promise<LookThroughPortfolioAnalysis> {
    console.log(`🔍 Starting integrated look-through analysis for portfolio ${portfolioId}`);
    const startTime = Date.now();

    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);

    // Schritt 1: Separiere Fonds von direkten Holdings
    const { fundPositions, directPositions } = this.separatePositions(positions);

    console.log(`Found ${fundPositions.length} funds and ${directPositions.length} direct holdings`);

    // Schritt 2: Analysiere alle Fonds mit Look-Through
    const fundAnalyses = await this.analyzeFunds(fundPositions, totalValue);

    // Schritt 3: Integriere direkte Holdings
    const directAllocations = this.processDirectHoldings(directPositions, totalValue);

    // Schritt 4: Kombiniere alle Allokationen
    const integratedAllocations = this.combineAllocations(fundAnalyses, directAllocations, totalValue);

    // Schritt 5: Validiere und normalisiere
    const validatedAllocations = this.validateAndNormalize(integratedAllocations);

    // Schritt 6: Berechne Qualitätsmetriken
    const qualityMetrics = this.calculateQualityMetrics(fundAnalyses, directPositions, totalValue);

    // Schritt 7: Generiere Recommendations
    const { warnings, recommendations } = this.generateInsights(validatedAllocations, qualityMetrics);

    const processingTime = Date.now() - startTime;
    console.log(`Integrated look-through analysis completed in ${processingTime}ms`);

    return {
      portfolioId,
      totalValue,
      timestamp: new Date().toISOString(),
      originalPositions: positions,
      fundAnalyses,
      integratedAllocations: validatedAllocations,
      qualityMetrics,
      detailedBreakdown: {
        directHoldings: directPositions,
        fundHoldings: fundAnalyses.map(fa => ({
          fundName: fa.fundName,
          fundPercentage: (fa.totalValue / totalValue) * 100,
          underlyingBreakdown: {
            assetClasses: fa.allocationBreakdown.assetClasses,
            regions: fa.allocationBreakdown.geographicRegions,
            currencies: fa.allocationBreakdown.currencies
          }
        }))
      },
      warnings,
      recommendations
    };
  }

  /**
   * Separiere Fonds von direkten Holdings
   */
  private separatePositions(positions: PortfolioPosition[]): {
    fundPositions: PortfolioPosition[];
    directPositions: PortfolioPosition[];
  } {
    const fundPositions: PortfolioPosition[] = [];
    const directPositions: PortfolioPosition[] = [];

    positions.forEach(position => {
      if (position.instrumentType === 'fund' || position.instrumentType === 'etf') {
        fundPositions.push(position);
      } else {
        directPositions.push(position);
      }
    });

    return { fundPositions, directPositions };
  }

  /**
   * Analysiere alle Fonds mit Enhanced Look-Through
   */
  private async analyzeFunds(
    fundPositions: PortfolioPosition[],
    totalPortfolioValue: number
  ): Promise<CompleteFundAnalysis[]> {
    const analyses: CompleteFundAnalysis[] = [];

    for (const fund of fundPositions) {
      try {
        console.log(`Analyzing fund: ${fund.name} (${fund.percentage}%)`);

        // Verwende Enhanced Fund Look-Through Service
        const analysis = await this.fundLookThroughService.performCompleteLookThrough(
          [fund],
          totalPortfolioValue
        );

        if (analysis.fundAnalyses.length > 0) {
          analyses.push(analysis.fundAnalyses[0]);
        }
      } catch (error) {
        console.error(`Error analyzing fund ${fund.name}:`, error);

        // Fallback-Analyse für fehlgeschlagene Fonds
        const fallbackAnalysis = await this.createFallbackFundAnalysis(fund);
        analyses.push(fallbackAnalysis);
      }
    }

    return analyses;
  }

  /**
   * Verarbeite direkte Holdings
   */
  private processDirectHoldings(
    directPositions: PortfolioPosition[],
    totalValue: number
  ): {
    assetClasses: Record<string, number>;
    geographicRegions: Record<string, number>;
    currencies: Record<string, number>;
    sectors?: Record<string, number>;
  } {
    const allocations = {
      assetClasses: {} as Record<string, number>,
      geographicRegions: {} as Record<string, number>,
      currencies: {} as Record<string, number>,
      sectors: {} as Record<string, number>
    };

    directPositions.forEach(position => {
      const weight = position.value / totalValue;

      // Asset-Klassen-Zuordnung
      let assetClass = this.mapInstrumentTypeToAssetClass(position.instrumentType);
      allocations.assetClasses[assetClass] =
        (allocations.assetClasses[assetClass] || 0) + weight;

      // Geografische Zuordnung (vereinfacht, basierend auf ISIN)
      let region = this.getRegionFromISIN(position.isin);
      allocations.geographicRegions[region] =
        (allocations.geographicRegions[region] || 0) + weight;

      // Währungszuordnung (basierend auf ISIN und Instrument)
      let currency = this.getCurrencyFromInstrument(position);
      allocations.currencies[currency] =
        (allocations.currencies[currency] || 0) + weight;

      // Sektor (falls verfügbar)
      if (position.classification) {
        allocations.sectors[position.classification] =
          (allocations.sectors[position.classification] || 0) + weight;
      }
    });

    return allocations;
  }

  /**
   * Kombiniere Fund-Analysen mit direkten Holdings
   */
  private combineAllocations(
    fundAnalyses: CompleteFundAnalysis[],
    directAllocations: any,
    totalValue: number
  ): LookThroughPortfolioAnalysis['integratedAllocations'] {
    const combined = {
      assetClasses: {} as Record<string, any>,
      geographicRegions: {} as Record<string, any>,
      currencies: {} as Record<string, any>,
      sectors: {} as Record<string, any>
    };

    // Verarbeite Fund-Analysen
    fundAnalyses.forEach(analysis => {
      const fundWeight = analysis.totalValue / totalValue;

      // Asset Classes
      Object.entries(analysis.allocationBreakdown.assetClasses).forEach(([asset, allocation]) => {
        const effectiveAllocation = allocation * fundWeight;
        if (!combined.assetClasses[asset]) {
          combined.assetClasses[asset] = {
            percentage: 0,
            value: 0,
            sources: []
          };
        }
        combined.assetClasses[asset].percentage += effectiveAllocation * 100;
        combined.assetClasses[asset].value += effectiveAllocation * totalValue;
        combined.assetClasses[asset].sources.push({
          sourceName: analysis.fundName,
          sourceType: 'fund' as const,
          contribution: effectiveAllocation * 100
        });
      });

      // Geographic Regions
      Object.entries(analysis.allocationBreakdown.geographicRegions).forEach(([region, allocation]) => {
        const effectiveAllocation = allocation * fundWeight;
        if (!combined.geographicRegions[region]) {
          combined.geographicRegions[region] = {
            percentage: 0,
            value: 0,
            sources: []
          };
        }
        combined.geographicRegions[region].percentage += effectiveAllocation * 100;
        combined.geographicRegions[region].value += effectiveAllocation * totalValue;
        combined.geographicRegions[region].sources.push({
          sourceName: analysis.fundName,
          sourceType: 'fund' as const,
          contribution: effectiveAllocation * 100
        });
      });

      // Currencies
      Object.entries(analysis.allocationBreakdown.currencies).forEach(([currency, allocation]) => {
        const effectiveAllocation = allocation * fundWeight;
        if (!combined.currencies[currency]) {
          combined.currencies[currency] = {
            percentage: 0,
            value: 0,
            sources: []
          };
        }
        combined.currencies[currency].percentage += effectiveAllocation * 100;
        combined.currencies[currency].value += effectiveAllocation * totalValue;
        combined.currencies[currency].sources.push({
          sourceName: analysis.fundName,
          sourceType: 'fund' as const,
          contribution: effectiveAllocation * 100
        });
      });
    });

    // Füge direkte Holdings hinzu
    Object.entries(directAllocations.assetClasses).forEach(([asset, allocation]) => {
      if (!combined.assetClasses[asset]) {
        combined.assetClasses[asset] = {
          percentage: 0,
          value: 0,
          sources: []
        };
      }
      combined.assetClasses[asset].percentage += allocation * 100;
      combined.assetClasses[asset].value += allocation * totalValue;
      combined.assetClasses[asset].sources.push({
        sourceName: 'Direkte Holdings',
        sourceType: 'direct' as const,
        contribution: allocation * 100
      });
    });

    // Gleiche Logik für Regionen und Währungen...
    Object.entries(directAllocations.geographicRegions).forEach(([region, allocation]) => {
      if (!combined.geographicRegions[region]) {
        combined.geographicRegions[region] = {
          percentage: 0,
          value: 0,
          sources: []
        };
      }
      combined.geographicRegions[region].percentage += allocation * 100;
      combined.geographicRegions[region].value += allocation * totalValue;
      combined.geographicRegions[region].sources.push({
        sourceName: 'Direkte Holdings',
        sourceType: 'direct' as const,
        contribution: allocation * 100
      });
    });

    Object.entries(directAllocations.currencies).forEach(([currency, allocation]) => {
      if (!combined.currencies[currency]) {
        combined.currencies[currency] = {
          percentage: 0,
          value: 0,
          sources: []
        };
      }
      combined.currencies[currency].percentage += allocation * 100;
      combined.currencies[currency].value += allocation * totalValue;
      combined.currencies[currency].sources.push({
        sourceName: 'Direkte Holdings',
        sourceType: 'direct' as const,
        contribution: allocation * 100
      });
    });

    return combined;
  }

  /**
   * Validiere und normalisiere Allokationen
   */
  private validateAndNormalize(allocations: any): any {
    // Normalisiere Asset Classes auf 100%
    this.normalizeCategory(allocations.assetClasses);

    // Normalisiere Geographic Regions auf 100%
    this.normalizeCategory(allocations.geographicRegions);

    // Normalisiere Currencies auf 100%
    this.normalizeCategory(allocations.currencies);

    return allocations;
  }

  /**
   * Normalisiere eine Kategorie auf 100%
   */
  private normalizeCategory(category: Record<string, any>): void {
    const totalPercentage = Object.values(category).reduce((sum: number, item: any) => sum + item.percentage, 0);

    if (totalPercentage > 0 && Math.abs(totalPercentage - 100) > 0.1) {
      const factor = 100 / totalPercentage;
      Object.values(category).forEach((item: any) => {
        item.percentage *= factor;
        // Aktualisiere auch die Sources
        item.sources.forEach((source: any) => {
          source.contribution *= factor;
        });
      });
    }
  }

  /**
   * Berechne Qualitätsmetriken
   */
  private calculateQualityMetrics(
    fundAnalyses: CompleteFundAnalysis[],
    directPositions: PortfolioPosition[],
    totalValue: number
  ): LookThroughPortfolioAnalysis['qualityMetrics'] {
    const fundValue = fundAnalyses.reduce((sum, fa) => sum + fa.totalValue, 0);
    const directValue = directPositions.reduce((sum, pos) => sum + pos.value, 0);

    const overallLookThroughCoverage = fundValue / totalValue;

    const averageDataQuality = fundAnalyses.length > 0 ?
      fundAnalyses.reduce((sum, fa) => sum + fa.qualityMetrics.overallScore, 0) / fundAnalyses.length : 0;

    const mathematicalConsistency = 0.95; // Placeholder - würde durch Validierung berechnet
    const complianceScore = 0.90; // Placeholder - würde durch Compliance-Checks berechnet

    return {
      overallLookThroughCoverage,
      averageDataQuality,
      mathematicalConsistency,
      complianceScore
    };
  }

  /**
   * Generiere Insights und Empfehlungen
   */
  private generateInsights(
    allocations: any,
    qualityMetrics: any
  ): { warnings: string[]; recommendations: string[] } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Qualitätswarnungen
    if (qualityMetrics.averageDataQuality < 0.7) {
      warnings.push('Niedrige Datenqualität bei Fund-Analysen');
      recommendations.push('Aktualisierung der Factsheet-Daten empfohlen');
    }

    if (qualityMetrics.overallLookThroughCoverage < 0.5) {
      warnings.push('Geringer Look-Through-Abdeckungsgrad');
      recommendations.push('Detailliertere Fund-Analyse erforderlich');
    }

    // Allokationswarnungen
    const sonstigeAssets = Object.keys(allocations.assetClasses)
      .filter(key => key.toLowerCase().includes('sonstige') || key.toLowerCase().includes('other'))
      .reduce((sum, key) => sum + allocations.assetClasses[key].percentage, 0);

    if (sonstigeAssets > 2) {
      warnings.push(`"Sonstige" Asset-Klassen: ${sonstigeAssets.toFixed(1)}% (über 2% Grenze)`);
      recommendations.push('Weitere Klassifizierung der "Sonstigen" Positionen vornehmen');
    }

    return { warnings, recommendations };
  }

  /**
   * Hilfsmethoden
   */
  private mapInstrumentTypeToAssetClass(instrumentType: string): string {
    const mapping: Record<string, string> = {
      'stock': 'Aktien',
      'bond': 'Anleihen',
      'cash': 'Liquidität',
      'fund': 'Mischfonds',
      'etf': 'ETF',
      'other': 'Sonstige'
    };
    return mapping[instrumentType] || 'Sonstige';
  }

  private getRegionFromISIN(isin?: string): string {
    if (!isin) return 'Unbekannt';

    const countryCode = isin.substring(0, 2);
    const mapping: Record<string, string> = {
      'US': 'USA/Nordamerika',
      'DE': 'Europa',
      'FR': 'Europa',
      'GB': 'Europa',
      'IT': 'Europa',
      'ES': 'Europa',
      'NL': 'Europa',
      'CH': 'Europa',
      'JP': 'Asien-Pazifik',
      'AU': 'Asien-Pazifik',
      'CN': 'Schwellenländer',
      'IN': 'Schwellenländer',
      'BR': 'Schwellenländer'
    };

    return mapping[countryCode] || 'Sonstige';
  }

  private getCurrencyFromInstrument(position: PortfolioPosition): string {
    if (position.isin) {
      const countryCode = position.isin.substring(0, 2);
      const mapping: Record<string, string> = {
        'US': 'USD',
        'DE': 'EUR',
        'FR': 'EUR',
        'IT': 'EUR',
        'ES': 'EUR',
        'NL': 'EUR',
        'GB': 'GBP',
        'CH': 'CHF',
        'JP': 'JPY',
        'CA': 'CAD',
        'AU': 'AUD'
      };
      return mapping[countryCode] || 'EUR';
    }
    return 'EUR';
  }

  private async createFallbackFundAnalysis(fund: PortfolioPosition): Promise<CompleteFundAnalysis> {
    return {
      fundName: fund.name,
      fundIsin: fund.isin,
      totalValue: fund.value,
      allocationBreakdown: {
        assetClasses: { 'Mischfonds': 1.0 },
        geographicRegions: { 'Europa': 0.6, 'USA/Nordamerika': 0.4 },
        currencies: { 'EUR': 0.6, 'USD': 0.4 },
        confidence: 0.1,
        dataSource: 'estimated',
        warnings: ['Vollständige Fallback-Schätzung']
      },
      underlyingHoldings: [{
        instrumentName: fund.name,
        allocation: 1.0,
        value: fund.value,
        instrumentType: 'Fonds',
        weight: 1.0,
        effectiveWeight: 1.0,
        currency: 'EUR',
        dataSource: 'estimated',
        confidence: 0.1
      }],
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