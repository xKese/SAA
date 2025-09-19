/**
 * Mathematical Validation Service
 * Ensures mathematical precision and consistency according to German financial standards
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  adjustments?: Record<string, number>;
}

export interface AllocationData {
  category: string;
  value: number;
  percentage: number;
}

export interface PlausibilityRange {
  min: number;
  max: number;
  metric: string;
}

export class MathematicalValidator {
  private static readonly TOLERANCE = 0.1; // ±0.1% tolerance for sums
  private static readonly SONSTIGE_THRESHOLD = 2.0; // Max 2% for "Sonstige"

  /**
   * Plausibility ranges for risk metrics
   */
  private static readonly PLAUSIBILITY_RANGES: PlausibilityRange[] = [
    { metric: 'expectedReturn', min: 0, max: 15 },
    { metric: 'volatility', min: 5, max: 25 },
    { metric: 'sharpeRatio', min: -0.5, max: 2.0 },
    { metric: 'diversificationQuotient', min: 0.0, max: 1.0 },
    { metric: 'maxDrawdown', min: -50, max: 0 }
  ];

  /**
   * Validate that allocations sum to 100% ±0.1%
   */
  static validateSummation(allocations: AllocationData[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    const sum = allocations.reduce((acc, a) => acc + a.percentage, 0);
    const difference = Math.abs(sum - 100);

    if (difference > this.TOLERANCE) {
      result.isValid = false;
      result.errors.push(
        `Allocation sum is ${sum.toFixed(2)}%, exceeds tolerance of 100% ±${this.TOLERANCE}%`
      );

      // Calculate adjustment needed
      result.adjustments = this.calculateAdjustments(allocations, sum);
    } else if (difference > 0.01) {
      result.warnings.push(
        `Allocation sum is ${sum.toFixed(2)}%, within tolerance but not exact`
      );
    }

    return result;
  }

  /**
   * Validate that Sonstige/Nicht zugeordnet is less than 2%
   */
  static validateSonstigeLimit(allocations: AllocationData[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    const sonstigeCategories = ['Sonstige', 'Nicht zugeordnet', 'Other', 'Unclassified'];
    const sonstige = allocations.filter(a =>
      sonstigeCategories.some(cat =>
        a.category.toLowerCase().includes(cat.toLowerCase())
      )
    );

    const totalSonstige = sonstige.reduce((acc, a) => acc + a.percentage, 0);

    if (totalSonstige >= this.SONSTIGE_THRESHOLD) {
      result.isValid = false;
      result.errors.push(
        `"Sonstige/Nicht zugeordnet" is ${totalSonstige.toFixed(2)}%, exceeds ${this.SONSTIGE_THRESHOLD}% limit`
      );
    } else if (totalSonstige > this.SONSTIGE_THRESHOLD * 0.8) {
      result.warnings.push(
        `"Sonstige/Nicht zugeordnet" is ${totalSonstige.toFixed(2)}%, approaching ${this.SONSTIGE_THRESHOLD}% limit`
      );
    }

    return result;
  }

  /**
   * Validate consistency between different allocation tables
   */
  static validateCrossTableConsistency(
    assetAllocations: AllocationData[],
    currencyAllocations: AllocationData[],
    geographicAllocations: AllocationData[]
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check that total values are consistent
    const assetTotal = assetAllocations.reduce((acc, a) => acc + a.value, 0);
    const currencyTotal = currencyAllocations.reduce((acc, a) => acc + a.value, 0);

    const valueDifference = Math.abs(assetTotal - currencyTotal);
    const percentageDifference = (valueDifference / assetTotal) * 100;

    if (percentageDifference > 0.1) {
      result.isValid = false;
      result.errors.push(
        `Total values inconsistent between asset (€${assetTotal.toFixed(2)}) and currency (€${currencyTotal.toFixed(2)}) tables`
      );
    }

    // Check that equity percentage in asset allocation matches geographic allocation base
    const equityAllocation = assetAllocations.find(a =>
      a.category.toLowerCase().includes('aktien') ||
      a.category.toLowerCase().includes('equit')
    );

    if (equityAllocation) {
      const geographicSum = geographicAllocations.reduce((acc, a) => acc + a.percentage, 0);
      if (Math.abs(geographicSum - 100) > this.TOLERANCE) {
        result.errors.push(
          `Geographic allocations must sum to 100% of equity portion, currently ${geographicSum.toFixed(2)}%`
        );
      }
    }

    return result;
  }

  /**
   * Validate risk metrics plausibility
   */
  static validateRiskMetrics(metrics: Record<string, number>): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    for (const range of this.PLAUSIBILITY_RANGES) {
      const value = metrics[range.metric];
      if (value === undefined || value === null) continue;

      if (value < range.min || value > range.max) {
        result.isValid = false;
        result.errors.push(
          `${range.metric} value ${value.toFixed(2)} outside plausible range [${range.min}, ${range.max}]`
        );
      }
    }

    // Additional cross-metric validations
    if (metrics.expectedShortfall !== undefined && metrics.valueAtRisk !== undefined) {
      if (Math.abs(metrics.expectedShortfall) < Math.abs(metrics.valueAtRisk)) {
        result.isValid = false;
        result.errors.push(
          `Expected Shortfall (${metrics.expectedShortfall.toFixed(2)}) must be greater than VaR (${metrics.valueAtRisk.toFixed(2)}) in absolute terms`
        );
      }
    }

    return result;
  }

  /**
   * Calculate adjustments needed to reach exactly 100%
   */
  private static calculateAdjustments(
    allocations: AllocationData[],
    currentSum: number
  ): Record<string, number> {
    const adjustments: Record<string, number> = {};
    const difference = 100 - currentSum;

    // Find the largest allocation to adjust
    const sorted = [...allocations].sort((a, b) => b.percentage - a.percentage);
    const largestCategory = sorted[0];

    if (largestCategory) {
      adjustments[largestCategory.category] = largestCategory.percentage + difference;
    }

    return adjustments;
  }

  /**
   * Apply automatic rounding correction
   */
  static applyRoundingCorrection(allocations: AllocationData[]): AllocationData[] {
    const corrected = [...allocations];
    const sum = corrected.reduce((acc, a) => acc + a.percentage, 0);
    const difference = 100 - sum;

    if (Math.abs(difference) <= this.TOLERANCE && Math.abs(difference) > 0.01) {
      // Apply correction to largest allocation
      const largest = corrected.reduce((prev, curr) =>
        curr.percentage > prev.percentage ? curr : prev
      );
      largest.percentage = Math.round((largest.percentage + difference) * 100) / 100;
    }

    return corrected;
  }

  /**
   * Comprehensive validation suite
   */
  static performCompleteValidation(
    assetAllocations: AllocationData[],
    currencyAllocations: AllocationData[],
    geographicAllocations: AllocationData[],
    riskMetrics: Record<string, number>
  ): ValidationResult {
    const results: ValidationResult[] = [];

    // Individual validations
    results.push(this.validateSummation(assetAllocations));
    results.push(this.validateSummation(currencyAllocations));
    results.push(this.validateSummation(geographicAllocations));
    results.push(this.validateSonstigeLimit(assetAllocations));
    results.push(this.validateCrossTableConsistency(
      assetAllocations,
      currencyAllocations,
      geographicAllocations
    ));
    results.push(this.validateRiskMetrics(riskMetrics));

    // Combine results
    const combinedResult: ValidationResult = {
      isValid: results.every(r => r.isValid),
      errors: results.flatMap(r => r.errors),
      warnings: results.flatMap(r => r.warnings)
    };

    return combinedResult;
  }

  /**
   * Format validation report
   */
  static formatValidationReport(result: ValidationResult): string {
    let report = '## Validierungsbericht\n\n';

    if (result.isValid) {
      report += '✅ **Alle Validierungen erfolgreich**\n\n';
    } else {
      report += '❌ **Validierung fehlgeschlagen**\n\n';
    }

    if (result.errors.length > 0) {
      report += '### Fehler:\n';
      result.errors.forEach(error => {
        report += `- ${error}\n`;
      });
      report += '\n';
    }

    if (result.warnings.length > 0) {
      report += '### Warnungen:\n';
      result.warnings.forEach(warning => {
        report += `- ${warning}\n`;
      });
      report += '\n';
    }

    if (result.adjustments) {
      report += '### Empfohlene Anpassungen:\n';
      Object.entries(result.adjustments).forEach(([category, value]) => {
        report += `- ${category}: ${value.toFixed(2)}%\n`;
      });
    }

    return report;
  }
}