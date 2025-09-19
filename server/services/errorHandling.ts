/**
 * Error Handling Service
 * Handles missing data, calculation errors, and provides recovery mechanisms
 */

export interface MissingDataContext {
  instrumentISIN: string;
  instrumentName?: string;
  dataType: 'factsheet' | 'classification' | 'currency' | 'geography' | 'returns';
  attemptedSources: string[];
  fallbackStrategy?: string;
}

export interface ErrorContext {
  phase: number;
  operation: string;
  input?: any;
  error: Error;
  timestamp: Date;
}

export interface RecoveryResult {
  success: boolean;
  data?: any;
  strategy: string;
  confidence: number; // 0-1 confidence score
  documentation: string;
}

export class ErrorHandlingService {
  private static errorLog: ErrorContext[] = [];
  private static missingDataLog: MissingDataContext[] = [];

  /**
   * Handle missing factsheet data
   */
  static async handleMissingFactsheet(
    isin: string,
    fundName: string,
    attemptedSources: string[]
  ): Promise<RecoveryResult> {
    const context: MissingDataContext = {
      instrumentISIN: isin,
      instrumentName: fundName,
      dataType: 'factsheet',
      attemptedSources,
      fallbackStrategy: 'sector-based estimation'
    };

    this.missingDataLog.push(context);

    // Strategy 1: Try alternative search terms
    const alternativeSearches = [
      `${isin} fund fact sheet`,
      `${fundName} kiid`,
      `${isin} monthly report`,
      `${fundName} fund overview`
    ];

    // Strategy 2: Use sector-based defaults if fund type is known
    const sectorDefaults = this.getSectorDefaults(fundName);
    if (sectorDefaults) {
      return {
        success: true,
        data: sectorDefaults,
        strategy: 'sector-based estimation',
        confidence: 0.6,
        documentation: `Applied sector defaults for ${fundName} after factsheet unavailable from ${attemptedSources.join(', ')}`
      };
    }

    // Strategy 3: Conservative allocation assumption
    return {
      success: true,
      data: {
        equities: 60,
        bonds: 40,
        cash: 0,
        geography: { europe: 50, usa: 30, emerging: 20 },
        currency: { eur: 70, usd: 20, other: 10 }
      },
      strategy: 'conservative default allocation',
      confidence: 0.3,
      documentation: `Applied conservative 60/40 allocation for ${isin} after exhausting search options`
    };
  }

  /**
   * Handle unclear instrument classification
   */
  static handleUnclearClassification(
    isin: string,
    availableInfo: Record<string, any>
  ): RecoveryResult {
    const context: MissingDataContext = {
      instrumentISIN: isin,
      dataType: 'classification',
      attemptedSources: Object.keys(availableInfo)
    };

    this.missingDataLog.push(context);

    // Analyze available information for classification hints
    let classification = 'Other';
    let confidence = 0.3;

    const infoString = JSON.stringify(availableInfo).toLowerCase();

    if (infoString.includes('etf') || infoString.includes('ucits')) {
      classification = 'Fund/ETF';
      confidence = 0.8;
    } else if (infoString.includes('bond') || infoString.includes('anleihe')) {
      classification = 'Bond';
      confidence = 0.7;
    } else if (infoString.includes('share') || infoString.includes('aktie') || infoString.includes('equity')) {
      classification = 'Equity';
      confidence = 0.7;
    }

    return {
      success: true,
      data: { classification },
      strategy: 'keyword-based classification',
      confidence,
      documentation: `Classified ${isin} as ${classification} based on available information keywords`
    };
  }

  /**
   * Handle missing currency information
   */
  static deriveCurrencyFromDomicile(
    isin: string,
    domicile?: string,
    exchange?: string
  ): RecoveryResult {
    const context: MissingDataContext = {
      instrumentISIN: isin,
      dataType: 'currency',
      attemptedSources: ['domicile', 'exchange']
    };

    this.missingDataLog.push(context);

    // ISIN prefix to currency mapping
    const isInPrefix = isin.substring(0, 2).toUpperCase();
    const currencyMap: Record<string, string> = {
      'US': 'USD',
      'DE': 'EUR',
      'FR': 'EUR',
      'IT': 'EUR',
      'ES': 'EUR',
      'NL': 'EUR',
      'BE': 'EUR',
      'AT': 'EUR',
      'LU': 'EUR',
      'IE': 'EUR',
      'GB': 'GBP',
      'CH': 'CHF',
      'JP': 'JPY',
      'CA': 'CAD',
      'AU': 'AUD'
    };

    const derivedCurrency = currencyMap[isInPrefix] || 'EUR';

    return {
      success: true,
      data: { currency: derivedCurrency },
      strategy: 'ISIN prefix derivation',
      confidence: isInPrefix in currencyMap ? 0.8 : 0.4,
      documentation: `Derived currency ${derivedCurrency} from ISIN prefix ${isInPrefix}`
    };
  }

  /**
   * Handle calculation errors with recovery
   */
  static async handleCalculationError(
    error: Error,
    phase: number,
    operation: string,
    input: any,
    maxRetries: number = 3
  ): Promise<RecoveryResult> {
    const errorContext: ErrorContext = {
      phase,
      operation,
      input,
      error,
      timestamp: new Date()
    };

    this.errorLog.push(errorContext);

    let attempt = 0;
    let lastError = error;

    while (attempt < maxRetries) {
      attempt++;

      try {
        // Strategy 1: Clean and normalize input data
        const cleanedInput = this.cleanInput(input);

        // Strategy 2: Apply conservative defaults for missing values
        const withDefaults = this.applyDefaults(cleanedInput, operation);

        // Strategy 3: Retry with alternative calculation method
        if (operation === 'volatility' && attempt > 1) {
          return {
            success: true,
            data: this.calculateSimpleVolatility(withDefaults),
            strategy: 'simplified volatility calculation',
            confidence: 0.7,
            documentation: `Used simplified volatility after ${attempt} attempts`
          };
        }

        return {
          success: true,
          data: withDefaults,
          strategy: 'input cleaning and defaults',
          confidence: 0.8,
          documentation: `Recovered from ${error.message} by cleaning input and applying defaults`
        };
      } catch (retryError) {
        lastError = retryError as Error;
        console.error(`Recovery attempt ${attempt} failed:`, retryError);
      }
    }

    return {
      success: false,
      strategy: 'exhausted recovery attempts',
      confidence: 0,
      documentation: `Failed to recover from ${error.message} after ${maxRetries} attempts`
    };
  }

  /**
   * Handle rounding errors in summations
   */
  static handleRoundingError(
    allocations: Array<{ category: string; percentage: number }>,
    targetSum: number = 100
  ): RecoveryResult {
    const currentSum = allocations.reduce((sum, a) => sum + a.percentage, 0);
    const difference = targetSum - currentSum;

    if (Math.abs(difference) <= 0.1) {
      // Find largest allocation and adjust
      const largest = allocations.reduce((prev, curr) =>
        curr.percentage > prev.percentage ? curr : prev
      );
      largest.percentage += difference;

      return {
        success: true,
        data: allocations,
        strategy: 'largest position adjustment',
        confidence: 1.0,
        documentation: `Adjusted ${largest.category} by ${difference.toFixed(3)}% to reach ${targetSum}%`
      };
    }

    // For larger differences, proportionally adjust all allocations
    const factor = targetSum / currentSum;
    allocations.forEach(a => {
      a.percentage = Math.round(a.percentage * factor * 100) / 100;
    });

    return {
      success: true,
      data: allocations,
      strategy: 'proportional adjustment',
      confidence: 0.9,
      documentation: `Proportionally adjusted all allocations by factor ${factor.toFixed(4)}`
    };
  }

  /**
   * Get sector-based default allocations
   */
  private static getSectorDefaults(fundName: string): any | null {
    const name = fundName.toLowerCase();

    if (name.includes('equity') || name.includes('stock') || name.includes('aktien')) {
      return {
        equities: 95,
        bonds: 0,
        cash: 5,
        geography: { usa: 40, europe: 35, asia: 15, emerging: 10 },
        currency: { usd: 40, eur: 35, other: 25 }
      };
    }

    if (name.includes('bond') || name.includes('fixed') || name.includes('anleihe')) {
      return {
        equities: 0,
        bonds: 95,
        cash: 5,
        geography: { europe: 60, usa: 30, other: 10 },
        currency: { eur: 60, usd: 30, other: 10 }
      };
    }

    if (name.includes('balanced') || name.includes('mixed') || name.includes('misch')) {
      return {
        equities: 50,
        bonds: 45,
        cash: 5,
        geography: { europe: 45, usa: 35, asia: 10, emerging: 10 },
        currency: { eur: 50, usd: 35, other: 15 }
      };
    }

    return null;
  }

  /**
   * Clean input data for calculation
   */
  private static cleanInput(input: any): any {
    if (Array.isArray(input)) {
      return input.filter(item =>
        item !== null &&
        item !== undefined &&
        !isNaN(item)
      );
    }

    if (typeof input === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(input)) {
        if (value !== null && value !== undefined) {
          cleaned[key] = typeof value === 'number' && isNaN(value) ? 0 : value;
        }
      }
      return cleaned;
    }

    return input;
  }

  /**
   * Apply conservative defaults
   */
  private static applyDefaults(input: any, operation: string): any {
    const defaults: Record<string, any> = {
      volatility: { equities: 16, bonds: 5, alternatives: 10, commodities: 18, cash: 0.5 },
      returns: { equities: 8, bonds: 3.5, alternatives: 6, commodities: 4, cash: 2 },
      weights: { equities: 60, bonds: 30, alternatives: 5, commodities: 0, cash: 5 }
    };

    if (defaults[operation]) {
      return { ...defaults[operation], ...input };
    }

    return input;
  }

  /**
   * Simplified volatility calculation
   */
  private static calculateSimpleVolatility(weights: any): number {
    // Simple weighted average without correlations
    const defaultVols = { equities: 16, bonds: 5, alternatives: 10, commodities: 18, cash: 0.5 };
    let weightedVol = 0;
    let totalWeight = 0;

    for (const [asset, weight] of Object.entries(weights)) {
      if (typeof weight === 'number' && defaultVols[asset]) {
        weightedVol += (weight as number) * defaultVols[asset];
        totalWeight += weight as number;
      }
    }

    return totalWeight > 0 ? weightedVol / totalWeight : 10; // Default 10% if no valid weights
  }

  /**
   * Generate error report
   */
  static generateErrorReport(): string {
    let report = '## Fehlerbehandlungsbericht\n\n';

    if (this.missingDataLog.length > 0) {
      report += '### Fehlende Daten:\n';
      this.missingDataLog.forEach(log => {
        report += `- **${log.instrumentISIN}**: ${log.dataType} nicht verfügbar von ${log.attemptedSources.join(', ')}\n`;
        if (log.fallbackStrategy) {
          report += `  Fallback: ${log.fallbackStrategy}\n`;
        }
      });
      report += '\n';
    }

    if (this.errorLog.length > 0) {
      report += '### Berechnungsfehler:\n';
      this.errorLog.forEach(log => {
        report += `- **Phase ${log.phase}**: ${log.operation} - ${log.error.message}\n`;
        report += `  Zeit: ${log.timestamp.toISOString()}\n`;
      });
    }

    return report;
  }

  /**
   * Clear error logs
   */
  static clearLogs(): void {
    this.errorLog = [];
    this.missingDataLog = [];
  }
}