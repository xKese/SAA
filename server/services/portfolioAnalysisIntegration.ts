/**
 * Portfolio Analysis Integration Service
 * Integrates German standard compliance services with existing Claude analysis
 */

import { GermanTableFormatter } from './germanTableFormatter';
import { MathematicalValidator, AllocationData } from './mathematicalValidation';
import { RiskMetricsCalculator, PortfolioWeights } from './riskMetricsCalculator';
import { ErrorHandlingService } from './errorHandling';
import { QualityAssuranceService } from './qualityAssurance';

export interface IntegratedAnalysisResult {
  formattedTables: string;
  validationReport: string;
  riskMetrics: any;
  qualityReport: string;
  errorReport?: string;
  rawData: {
    assetAllocations: AllocationData[];
    currencyExposures: AllocationData[];
    geographicAllocations: AllocationData[];
    instruments: any[];
  };
}

export class PortfolioAnalysisIntegration {
  /**
   * Process raw Claude analysis output and apply German standards
   */
  static async processAnalysisResults(
    claudeOutput: any,
    portfolioPositions: any[]
  ): Promise<IntegratedAnalysisResult> {
    try {
      // Step 1: Extract and normalize allocations from Claude output
      const extractedData = this.extractAllocations(claudeOutput);

      // Step 2: Apply mathematical validation and corrections
      const validatedData = await this.validateAndCorrect(extractedData);

      // Step 3: Calculate enhanced risk metrics
      const enhancedRiskMetrics = await this.calculateEnhancedRiskMetrics(
        validatedData.assetAllocations
      );

      // Step 4: Format tables according to German standards
      const formattedTables = GermanTableFormatter.formatCompleteAnalysis(
        validatedData.assetAllocations,
        validatedData.currencyExposures,
        validatedData.geographicAllocations,
        GermanTableFormatter.formatMetrics(enhancedRiskMetrics)
      );

      // Step 5: Perform quality assurance
      const qualityReport = this.performQualityAssurance(
        validatedData,
        enhancedRiskMetrics,
        portfolioPositions
      );

      // Step 6: Generate error report if needed
      const errorReport = ErrorHandlingService.generateErrorReport();

      return {
        formattedTables,
        validationReport: this.generateValidationReport(validatedData),
        riskMetrics: enhancedRiskMetrics,
        qualityReport,
        errorReport: errorReport || undefined,
        rawData: validatedData
      };
    } catch (error) {
      console.error('Integration processing failed:', error);
      throw new Error(`Analysis integration failed: ${error.message}`);
    }
  }

  /**
   * Extract allocations from Claude output
   */
  private static extractAllocations(claudeOutput: any): {
    assetAllocations: AllocationData[];
    currencyExposures: AllocationData[];
    geographicAllocations: AllocationData[];
    instruments: any[];
  } {
    // Parse Claude's output structure
    const assetAllocations: AllocationData[] = [];
    const currencyExposures: AllocationData[] = [];
    const geographicAllocations: AllocationData[] = [];
    const instruments: any[] = [];

    // Extract asset allocations
    if (claudeOutput.assetAllocation) {
      for (const [category, data] of Object.entries(claudeOutput.assetAllocation)) {
        if (typeof data === 'object' && data !== null) {
          const allocation = data as any;
          assetAllocations.push({
            category: this.mapToGermanCategory(category),
            value: allocation.value || 0,
            percentage: allocation.percentage || 0
          });
        }
      }
    }

    // Extract currency exposures
    if (claudeOutput.currencyExposure) {
      for (const [currency, data] of Object.entries(claudeOutput.currencyExposure)) {
        if (typeof data === 'object' && data !== null) {
          const exposure = data as any;
          currencyExposures.push({
            category: currency.toUpperCase(),
            value: exposure.value || 0,
            percentage: exposure.percentage || 0
          });
        }
      }
    }

    // Extract geographic allocations
    if (claudeOutput.geographicAllocation) {
      for (const [region, data] of Object.entries(claudeOutput.geographicAllocation)) {
        if (typeof data === 'object' && data !== null) {
          const allocation = data as any;
          geographicAllocations.push({
            category: this.mapToGermanRegion(region),
            value: 0, // Geographic typically doesn't have value, just percentage
            percentage: allocation.percentage || 0
          });
        }
      }
    }

    // Extract instruments
    if (claudeOutput.positions) {
      instruments.push(...claudeOutput.positions);
    }

    return {
      assetAllocations,
      currencyExposures,
      geographicAllocations,
      instruments
    };
  }

  /**
   * Validate and correct allocations
   */
  private static async validateAndCorrect(data: {
    assetAllocations: AllocationData[];
    currencyExposures: AllocationData[];
    geographicAllocations: AllocationData[];
    instruments: any[];
  }): Promise<typeof data> {
    // Apply mathematical validation
    const assetValidation = MathematicalValidator.validateSummation(data.assetAllocations);
    if (!assetValidation.isValid) {
      data.assetAllocations = MathematicalValidator.applyRoundingCorrection(data.assetAllocations);
    }

    const currencyValidation = MathematicalValidator.validateSummation(data.currencyExposures);
    if (!currencyValidation.isValid) {
      data.currencyExposures = MathematicalValidator.applyRoundingCorrection(data.currencyExposures);
    }

    const geoValidation = MathematicalValidator.validateSummation(data.geographicAllocations);
    if (!geoValidation.isValid) {
      data.geographicAllocations = MathematicalValidator.applyRoundingCorrection(data.geographicAllocations);
    }

    // Validate Sonstige limit
    const sonstigeValidation = MathematicalValidator.validateSonstigeLimit(data.assetAllocations);
    if (!sonstigeValidation.isValid) {
      // Redistribute Sonstige if over 2%
      const sonstige = data.assetAllocations.find(a =>
        a.category.includes('Sonstige') || a.category.includes('Other')
      );
      if (sonstige && sonstige.percentage > 2) {
        const excess = sonstige.percentage - 2;
        sonstige.percentage = 2;
        // Add excess to largest category
        const largest = data.assetAllocations
          .filter(a => a !== sonstige)
          .reduce((prev, curr) => curr.percentage > prev.percentage ? curr : prev);
        largest.percentage += excess;
      }
    }

    return data;
  }

  /**
   * Calculate enhanced risk metrics
   */
  private static async calculateEnhancedRiskMetrics(
    assetAllocations: AllocationData[]
  ): Promise<any> {
    // Convert allocations to weights for risk calculator
    const weights: PortfolioWeights = {
      equities: 0,
      bonds: 0,
      alternatives: 0,
      commodities: 0,
      cash: 0
    };

    // Map allocations to standard categories
    for (const allocation of assetAllocations) {
      const category = allocation.category.toLowerCase();
      if (category.includes('aktien') || category.includes('equit')) {
        weights.equities += allocation.percentage;
      } else if (category.includes('anleihe') || category.includes('bond')) {
        weights.bonds += allocation.percentage;
      } else if (category.includes('alternative')) {
        weights.alternatives += allocation.percentage;
      } else if (category.includes('edelmetall') || category.includes('commodit')) {
        weights.commodities += allocation.percentage;
      } else if (category.includes('cash') || category.includes('liquidität')) {
        weights.cash += allocation.percentage;
      }
    }

    // Calculate metrics with error recovery
    const metrics = RiskMetricsCalculator.calculateWithRecovery(weights);

    if (!metrics) {
      // Fallback to basic calculation if recovery fails
      return RiskMetricsCalculator.calculateAllMetrics(weights);
    }

    return metrics;
  }

  /**
   * Perform quality assurance checks
   */
  private static performQualityAssurance(
    data: any,
    riskMetrics: any,
    positions: any[]
  ): string {
    const analysisData = {
      instruments: positions.map(p => ({
        isin: p.isin || 'Unknown',
        value: p.value || 0,
        classification: p.classification,
        source: p.source
      })),
      assetAllocations: data.assetAllocations,
      currencyExposures: data.currencyExposures,
      geographicAllocations: data.geographicAllocations,
      riskMetrics,
      outputTables: ['Asset', 'Currency', 'Geographic', 'Risk'],
      missingData: []
    };

    const report = QualityAssuranceService.performQualityCheck(analysisData);
    return QualityAssuranceService.formatQualityReport(report);
  }

  /**
   * Generate validation report
   */
  private static generateValidationReport(data: any): string {
    const result = MathematicalValidator.performCompleteValidation(
      data.assetAllocations,
      data.currencyExposures,
      data.geographicAllocations,
      {}
    );

    return MathematicalValidator.formatValidationReport(result);
  }

  /**
   * Map English categories to German
   */
  private static mapToGermanCategory(category: string): string {
    const mappings: Record<string, string> = {
      'equities': 'Aktien',
      'bonds': 'Anleihen',
      'alternatives': 'Alternative Investments',
      'cash': 'Liquidität/Cash',
      'commodities': 'Edelmetalle',
      'money_market': 'Geldmarktanlagen',
      'real_estate': 'Immobilien',
      'other': 'Sonstige'
    };

    const key = category.toLowerCase().replace(/\s+/g, '_');
    return mappings[key] || category;
  }

  /**
   * Map English regions to German
   */
  private static mapToGermanRegion(region: string): string {
    const mappings: Record<string, string> = {
      'usa': 'USA/Nordamerika',
      'north_america': 'USA/Nordamerika',
      'europe': 'Europa (inkl. UK)',
      'emerging_markets': 'Schwellenländer',
      'asia_pacific': 'Asien-Pazifik',
      'asia': 'Asien-Pazifik',
      'cash': 'Cash in Aktienfonds',
      'other': 'Sonstige'
    };

    const key = region.toLowerCase().replace(/\s+/g, '_').replace('-', '_');
    return mappings[key] || region;
  }

  /**
   * Create before/after comparison
   */
  static createBeforeAfterComparison(
    beforeData: any,
    afterData: any,
    newInvestment: number
  ): string {
    const assetComparison = new Map<string, any>();
    const currencyComparison = new Map<string, any>();

    // Process asset allocations
    for (const allocation of beforeData.assetAllocations) {
      assetComparison.set(allocation.category, {
        before: allocation.value,
        investment: 0,
        after: allocation.value,
        percentageBefore: allocation.percentage,
        percentageAfter: 0,
        change: 0
      });
    }

    // Add new investment impact
    for (const allocation of afterData.assetAllocations) {
      if (assetComparison.has(allocation.category)) {
        const comp = assetComparison.get(allocation.category);
        comp.after = allocation.value;
        comp.investment = allocation.value - comp.before;
        comp.percentageAfter = allocation.percentage;
        comp.change = allocation.percentage - comp.percentageBefore;
      } else {
        assetComparison.set(allocation.category, {
          before: 0,
          investment: allocation.value,
          after: allocation.value,
          percentageBefore: 0,
          percentageAfter: allocation.percentage,
          change: allocation.percentage
        });
      }
    }

    // Create comparison tables
    const assetTable = GermanTableFormatter.createComparisonTable(
      'Anlagekategorien',
      assetComparison
    );

    // Similar process for currency
    for (const exposure of beforeData.currencyExposures) {
      currencyComparison.set(exposure.category, {
        before: exposure.value,
        investment: 0,
        after: exposure.value,
        percentageBefore: exposure.percentage,
        percentageAfter: 0,
        change: 0
      });
    }

    for (const exposure of afterData.currencyExposures) {
      if (currencyComparison.has(exposure.category)) {
        const comp = currencyComparison.get(exposure.category);
        comp.after = exposure.value;
        comp.investment = exposure.value - comp.before;
        comp.percentageAfter = exposure.percentage;
        comp.change = exposure.percentage - comp.percentageBefore;
      } else {
        currencyComparison.set(exposure.category, {
          before: 0,
          investment: exposure.value,
          after: exposure.value,
          percentageBefore: 0,
          percentageAfter: exposure.percentage,
          change: exposure.percentage
        });
      }
    }

    const currencyTable = GermanTableFormatter.createComparisonTable(
      'Währungen',
      currencyComparison
    );

    return `${assetTable}\n${currencyTable}`;
  }
}