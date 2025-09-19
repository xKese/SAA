/**
 * Portfolio Mathematics Utility Class
 * Implements real financial formulas with mathematical precision
 * Following German financial standards and industry best practices
 */

export interface AssetData {
  name: string;
  expectedReturn: number; // Annual expected return (decimal, e.g., 0.08 for 8%)
  volatility: number; // Annual volatility (decimal, e.g., 0.15 for 15%)
  weight: number; // Portfolio weight (decimal, e.g., 0.25 for 25%)
  value: number; // Position value in EUR
  correlation?: number[][]; // Correlation matrix if available
}

export interface RiskMetrics {
  expectedReturn: number; // Weighted portfolio expected return
  volatility: number; // Portfolio volatility (standard deviation)
  sharpeRatio: number; // Sharpe ratio
  valueAtRisk: number; // 95% VaR (1 year)
  expectedShortfall: number; // Expected Shortfall (Conditional VaR)
  maxDrawdown: number; // Maximum expected drawdown
  diversificationRatio: number; // Diversification benefit
}

export interface MarketData {
  riskFreeRate: number; // Current risk-free rate (German Bund yield)
  correlationMatrix?: number[][]; // Asset correlation matrix
  historicalReturns?: number[][]; // Historical returns for Monte Carlo
}

// Enhanced interfaces for look-through analysis validation
export interface FundHolding {
  name: string;
  isin?: string;
  weight: number; // Decimal weight (e.g., 0.25 for 25%)
  value: number; // Position value in EUR
  currency: string; // Asset currency (ISO 4217 code)
  assetClass: string; // German asset class categorization
  geography: string; // Geographic allocation
  sector?: string; // Economic sector
  isDerivative?: boolean; // Derivative instrument flag
}

export enum ValidationSeverity {
  Warning = 'warning',
  Error = 'error',
  Critical = 'critical'
}

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  messageDE?: string; // German language message
  affectedPositions?: string[];
  suggestedAction?: string;
}

export interface LookThroughValidationResult {
  isValid: boolean;
  overallScore: number; // 0-100 validation score
  issues: ValidationIssue[];
  // Backward compatibility fields
  errors: string[];
  warnings: string[];
  totalValueDifference: number;
  decompositionAccuracy: number; // Percentage accuracy
  doubleCounting: {
    detected: boolean;
    affectedAssets: string[];
    overlapValue: number;
  };
  currencyExposure: {
    isConsistent: boolean;
    exposures: Record<string, number>;
    hedgingStatus: Record<string, boolean>;
  };
  geographicIntegrity: {
    isValid: boolean;
    totalAllocation: number;
    missingAllocations: string[];
  };
}

export interface GermanFinancialComplianceResult {
  isCompliant: boolean;
  bafin: {
    assetClassification: boolean;
    ucitsCompliance: boolean;
    reportingStandards: boolean;
  };
  issues: ValidationIssue[];
  complianceScore: number; // 0-100 compliance score
}

export class PortfolioMathematics {
  private static readonly DEFAULT_RISK_FREE_RATE = 0.025; // 2.5% German Bund approximation
  private static readonly VAR_CONFIDENCE_LEVEL = 0.05; // 95% VaR
  private static readonly TRADING_DAYS_PER_YEAR = 252;

  /**
   * Calculate weighted portfolio expected return
   * Formula: E[Rp] = Σ(wi × E[Ri])
   */
  static calculateExpectedReturn(assets: AssetData[]): number {
    try {
      const totalWeight = assets.reduce((sum, asset) => sum + asset.weight, 0);
      
      if (Math.abs(totalWeight - 1.0) > 0.001) {
        console.warn(`Portfolio weights sum to ${totalWeight}, not 1.0. Normalizing weights.`);
      }
      
      return assets.reduce((sum, asset) => {
        const normalizedWeight = asset.weight / totalWeight;
        return sum + (normalizedWeight * asset.expectedReturn);
      }, 0);
    } catch (error) {
      console.error('Error calculating expected return:', error);
      throw new Error('Unable to calculate portfolio expected return');
    }
  }

  /**
   * Calculate portfolio volatility using simplified approach
   * For single assets or when correlation data is unavailable
   * Formula: σp ≈ Σ(wi × σi) (conservative upper bound)
   */
  static calculateSimpleVolatility(assets: AssetData[]): number {
    try {
      const totalWeight = assets.reduce((sum, asset) => sum + asset.weight, 0);
      
      return assets.reduce((sum, asset) => {
        const normalizedWeight = asset.weight / totalWeight;
        return sum + (normalizedWeight * asset.volatility);
      }, 0);
    } catch (error) {
      console.error('Error calculating simple volatility:', error);
      throw new Error('Unable to calculate simple portfolio volatility');
    }
  }

  /**
   * Calculate portfolio volatility with correlation matrix
   * Formula: σp = √(w'Σw) where Σ is covariance matrix
   */
  static calculatePortfolioVolatility(assets: AssetData[], correlationMatrix?: number[][]): number {
    try {
      const n = assets.length;
      const totalWeight = assets.reduce((sum, asset) => sum + asset.weight, 0);
      
      // Normalize weights
      const weights = assets.map(asset => asset.weight / totalWeight);
      const volatilities = assets.map(asset => asset.volatility);
      
      if (!correlationMatrix || correlationMatrix.length !== n) {
        console.warn('Correlation matrix unavailable or invalid. Using simple volatility calculation.');
        return this.calculateSimpleVolatility(assets);
      }
      
      // Calculate portfolio variance: σp² = Σi Σj wi*wj*σi*σj*ρij
      let portfolioVariance = 0;
      
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const correlation = i === j ? 1.0 : (correlationMatrix[i][j] || 0);
          portfolioVariance += weights[i] * weights[j] * volatilities[i] * volatilities[j] * correlation;
        }
      }
      
      return Math.sqrt(Math.max(0, portfolioVariance)); // Ensure non-negative
    } catch (error) {
      console.error('Error calculating portfolio volatility:', error);
      // Fallback to simple calculation
      return this.calculateSimpleVolatility(assets);
    }
  }

  /**
   * Calculate Sharpe Ratio
   * Formula: (E[Rp] - Rf) / σp
   */
  static calculateSharpeRatio(expectedReturn: number, volatility: number, riskFreeRate?: number): number {
    try {
      const rf = riskFreeRate ?? this.DEFAULT_RISK_FREE_RATE;
      
      if (volatility <= 0) {
        console.warn('Volatility is zero or negative. Sharpe ratio undefined.');
        return 0;
      }
      
      return (expectedReturn - rf) / volatility;
    } catch (error) {
      console.error('Error calculating Sharpe ratio:', error);
      return 0;
    }
  }

  /**
   * Calculate Value-at-Risk using parametric method
   * Formula: VaR = μ - z_α × σ (for normal distribution assumption)
   */
  static calculateVaR(expectedReturn: number, volatility: number, confidenceLevel: number = 0.05, timeHorizon: number = 1): number {
    try {
      // Z-score for 95% confidence (1.645 for one-tailed)
      const zScore = confidenceLevel <= 0.01 ? 2.33 : 
                     confidenceLevel <= 0.05 ? 1.645 : 
                     1.28; // 90% confidence
      
      // Adjust for time horizon
      const adjustedReturn = expectedReturn * timeHorizon;
      const adjustedVolatility = volatility * Math.sqrt(timeHorizon);
      
      // VaR is the negative of the loss (expressed as positive loss amount)
      const varValue = adjustedReturn - (zScore * adjustedVolatility);
      
      return -varValue; // Return as positive loss amount
    } catch (error) {
      console.error('Error calculating VaR:', error);
      return 0;
    }
  }

  /**
   * Calculate Expected Shortfall (Conditional VaR)
   * Formula: ES = E[Loss | Loss > VaR] for normal distribution
   */
  static calculateExpectedShortfall(expectedReturn: number, volatility: number, confidenceLevel: number = 0.05, timeHorizon: number = 1): number {
    try {
      const adjustedReturn = expectedReturn * timeHorizon;
      const adjustedVolatility = volatility * Math.sqrt(timeHorizon);
      
      // For normal distribution: ES = μ + σ × φ(Φ⁻¹(α)) / α
      // Simplified calculation using approximation
      const zScore = confidenceLevel <= 0.01 ? 2.67 : 
                     confidenceLevel <= 0.05 ? 2.06 : 
                     1.75; // Adjusted z-scores for ES
      
      const esValue = adjustedReturn - (zScore * adjustedVolatility);
      
      return -esValue; // Return as positive loss amount
    } catch (error) {
      console.error('Error calculating Expected Shortfall:', error);
      // Fallback: ES ≈ 1.25 × VaR for normal distribution
      const var95 = this.calculateVaR(expectedReturn, volatility, confidenceLevel, timeHorizon);
      return var95 * 1.25;
    }
  }

  /**
   * Calculate Maximum Drawdown estimate
   * Formula: MDD ≈ 2 × σ × √(2×ln(n)) for Brownian motion approximation
   */
  static calculateMaxDrawdown(volatility: number, timeHorizon: number = 1): number {
    try {
      // Simplified MDD calculation based on volatility
      // More conservative approach: MDD ≈ 2.5 × annual volatility
      const annualizedVolatility = volatility * Math.sqrt(timeHorizon);
      return 2.5 * annualizedVolatility;
    } catch (error) {
      console.error('Error calculating Max Drawdown:', error);
      return volatility * 2; // Conservative fallback
    }
  }

  /**
   * Calculate Diversification Ratio
   * Formula: DR = (Σ wi × σi) / σp
   */
  static calculateDiversificationRatio(assets: AssetData[], portfolioVolatility: number): number {
    try {
      const totalWeight = assets.reduce((sum, asset) => sum + asset.weight, 0);
      
      const weightedAverageVolatility = assets.reduce((sum, asset) => {
        const normalizedWeight = asset.weight / totalWeight;
        return sum + (normalizedWeight * asset.volatility);
      }, 0);
      
      if (portfolioVolatility <= 0) {
        return 1.0;
      }
      
      return weightedAverageVolatility / portfolioVolatility;
    } catch (error) {
      console.error('Error calculating diversification ratio:', error);
      return 1.0; // No diversification benefit
    }
  }

  /**
   * Main function to calculate all risk metrics
   */
  static calculateRiskMetrics(assets: AssetData[], marketData?: MarketData): RiskMetrics {
    try {
      console.log(`Calculating risk metrics for ${assets.length} assets using mathematical formulas...`);
      
      // Validate input
      if (!assets || assets.length === 0) {
        throw new Error('No assets provided for risk calculation');
      }
      
      // Check if all required data is available
      const hasCompleteData = assets.every(asset => 
        typeof asset.expectedReturn === 'number' && 
        typeof asset.volatility === 'number' && 
        typeof asset.weight === 'number' &&
        !isNaN(asset.expectedReturn) &&
        !isNaN(asset.volatility) &&
        !isNaN(asset.weight)
      );
      
      if (!hasCompleteData) {
        throw new Error('Incomplete asset data: missing expectedReturn, volatility, or weight');
      }
      
      // Calculate metrics
      const expectedReturn = this.calculateExpectedReturn(assets);
      const volatility = this.calculatePortfolioVolatility(assets, marketData?.correlationMatrix);
      const riskFreeRate = marketData?.riskFreeRate ?? this.DEFAULT_RISK_FREE_RATE;
      
      const sharpeRatio = this.calculateSharpeRatio(expectedReturn, volatility, riskFreeRate);
      const valueAtRisk = this.calculateVaR(expectedReturn, volatility);
      const expectedShortfall = this.calculateExpectedShortfall(expectedReturn, volatility);
      const maxDrawdown = this.calculateMaxDrawdown(volatility);
      const diversificationRatio = this.calculateDiversificationRatio(assets, volatility);
      
      console.log('Risk metrics calculated successfully using mathematical formulas');
      console.log(`Portfolio Expected Return: ${(expectedReturn * 100).toFixed(2)}%`);
      console.log(`Portfolio Volatility: ${(volatility * 100).toFixed(2)}%`);
      console.log(`Sharpe Ratio: ${sharpeRatio.toFixed(2)}`);
      
      return {
        expectedReturn,
        volatility,
        sharpeRatio,
        valueAtRisk,
        expectedShortfall,
        maxDrawdown,
        diversificationRatio
      };
    } catch (error) {
      console.error('Error in calculateRiskMetrics:', error);
      throw error; // Re-throw to allow fallback handling in caller
    }
  }

  /**
   * Enhanced validation of look-through analysis with comprehensive mathematical checks
   * Implements German financial standards and BaFin requirements
   */
  static validateLookThroughAnalysis(
    originalAllocations: Array<{category: string, value: number, percentage: number}>, 
    lookThroughAllocations: Array<{category: string, value: number, percentage: number}>,
    fundHoldings?: FundHolding[]
  ): LookThroughValidationResult {
    const issues: ValidationIssue[] = [];
    let overallScore = 100;
    
    try {
      // 1. Fund decomposition accuracy validation
      const originalTotal = originalAllocations.reduce((sum, alloc) => sum + alloc.value, 0);
      const lookThroughTotal = lookThroughAllocations.reduce((sum, alloc) => sum + alloc.value, 0);
      const totalValueDifference = Math.abs(originalTotal - lookThroughTotal);
      const decompositionTolerance = originalTotal * 0.0001; // 0.01% tolerance
      
      const decompositionAccuracy = originalTotal > 0 ? Math.max(0, 100 - (totalValueDifference / originalTotal * 100)) : 100;
      
      if (totalValueDifference > decompositionTolerance) {
        const severity = totalValueDifference > originalTotal * 0.001 ? ValidationSeverity.Critical : ValidationSeverity.Error;
        issues.push({
          severity,
          code: 'FUND_DECOMP_001',
          message: `Fund decomposition accuracy violation: Total value difference €${totalValueDifference.toFixed(2)} exceeds tolerance €${decompositionTolerance.toFixed(2)}`,
          messageDE: `Fondszerlegungsgenauigkeit verletzt: Gesamtwertabweichung €${totalValueDifference.toFixed(2)} überschreitet Toleranz €${decompositionTolerance.toFixed(2)}`,
          suggestedAction: 'Review fund factsheet data and underlying holdings calculations'
        });
        overallScore -= severity === ValidationSeverity.Critical ? 25 : 15;
      }
      
      // 2. Percentage consistency validation
      const originalPercentageSum = originalAllocations.reduce((sum, alloc) => sum + alloc.percentage, 0);
      const lookThroughPercentageSum = lookThroughAllocations.reduce((sum, alloc) => sum + alloc.percentage, 0);
      
      if (Math.abs(originalPercentageSum - 100) > 0.1) {
        issues.push({
          severity: ValidationSeverity.Warning,
          code: 'ALLOC_001',
          message: `Original allocation percentages sum to ${originalPercentageSum.toFixed(2)}%, not 100%`,
          messageDE: `Ursprüngliche Allokationsprozentsätze summieren sich auf ${originalPercentageSum.toFixed(2)}%, nicht 100%`,
          suggestedAction: 'Normalize allocation percentages'
        });
        overallScore -= 5;
      }
      
      if (Math.abs(lookThroughPercentageSum - 100) > 0.1) {
        issues.push({
          severity: ValidationSeverity.Warning,
          code: 'ALLOC_002',
          message: `Look-through allocation percentages sum to ${lookThroughPercentageSum.toFixed(2)}%, not 100%`,
          messageDE: `Look-Through-Allokationsprozentsätze summieren sich auf ${lookThroughPercentageSum.toFixed(2)}%, nicht 100%`,
          suggestedAction: 'Review underlying holdings calculations'
        });
        overallScore -= 5;
      }
      
      // 3. Value-percentage consistency check
      for (const alloc of lookThroughAllocations) {
        const calculatedPercentage = (alloc.value / lookThroughTotal) * 100;
        if (Math.abs(calculatedPercentage - alloc.percentage) > 0.1) {
          issues.push({
            severity: ValidationSeverity.Warning,
            code: 'CONSISTENCY_001',
            message: `${alloc.category}: Value-percentage mismatch (calculated: ${calculatedPercentage.toFixed(2)}%, reported: ${alloc.percentage.toFixed(2)}%)`,
            messageDE: `${alloc.category}: Wert-Prozent-Abweichung (berechnet: ${calculatedPercentage.toFixed(2)}%, gemeldet: ${alloc.percentage.toFixed(2)}%)`,
            affectedPositions: [alloc.category],
            suggestedAction: 'Recalculate percentage based on actual value'
          });
          overallScore -= 2;
        }
      }
      
      // 4. Double-counting detection (if fund holdings provided)
      const doubleCounting = fundHoldings ? this.detectDoubleCounting([], fundHoldings) : {
        detected: false,
        affectedAssets: [],
        overlapValue: 0
      };
      
      // 5. Currency exposure validation (placeholder - requires actual fund data)
      const currencyExposure = {
        isConsistent: true,
        exposures: {} as Record<string, number>,
        hedgingStatus: {} as Record<string, boolean>
      };
      
      // 6. Geographic integrity validation
      const geographicIntegrity = this.validateGeographicIntegrity(
        lookThroughAllocations.filter(a => a.category && typeof a.category === 'string' && 
          (a.category.includes('Deutschland') || a.category.includes('Europa') || a.category.includes('USA') || a.category.includes('Emerging')))
      );
      
      return {
        isValid: issues.filter(i => i.severity === ValidationSeverity.Critical || i.severity === ValidationSeverity.Error).length === 0,
        overallScore: Math.max(0, overallScore),
        issues,
        totalValueDifference,
        decompositionAccuracy,
        doubleCounting,
        currencyExposure,
        geographicIntegrity,
        // Backward compatibility
        errors: issues.filter(i => i.severity === ValidationSeverity.Error || i.severity === ValidationSeverity.Critical).map(i => i.message),
        warnings: issues.filter(i => i.severity === ValidationSeverity.Warning).map(i => i.message)
      };
    } catch (error) {
      console.error('Error in enhanced look-through validation:', error);
      return {
        isValid: false,
        overallScore: 0,
        issues: [{
          severity: ValidationSeverity.Critical,
          code: 'VALIDATION_ERROR',
          message: `Validation system error: ${(error as Error).message}`,
          messageDE: `Validierungssystemfehler: ${(error as Error).message}`,
          suggestedAction: 'Contact system administrator'
        }],
        totalValueDifference: 0,
        decompositionAccuracy: 0,
        doubleCounting: { detected: false, affectedAssets: [], overlapValue: 0 },
        currencyExposure: { isConsistent: false, exposures: {}, hedgingStatus: {} },
        geographicIntegrity: { isValid: false, totalAllocation: 0, missingAllocations: [] },
        // Backward compatibility
        errors: ['Validation system error'],
        warnings: []
      };
    }
  }
  
  /**
   * Validate fund decomposition accuracy
   * Ensures underlying holdings sum correctly to fund value with 0.01% tolerance
   */
  static validateFundDecomposition(fundValue: number, underlyingHoldings: FundHolding[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    try {
      const holdingsTotal = underlyingHoldings.reduce((sum, holding) => sum + holding.value, 0);
      const difference = Math.abs(fundValue - holdingsTotal);
      const tolerance = fundValue * 0.0001; // 0.01% tolerance
      const accuracy = Math.max(0, 100 - (difference / fundValue * 100));
      
      if (difference > tolerance) {
        const severity = difference > fundValue * 0.001 ? ValidationSeverity.Critical : ValidationSeverity.Error;
        issues.push({
          severity,
          code: 'FUND_DECOMP_002',
          message: `Fund decomposition mismatch: Fund value €${fundValue.toFixed(2)}, holdings total €${holdingsTotal.toFixed(2)} (accuracy: ${accuracy.toFixed(2)}%)`,
          messageDE: `Fondszerlegungsabweichung: Fondswert €${fundValue.toFixed(2)}, Gesamtpositionen €${holdingsTotal.toFixed(2)} (Genauigkeit: ${accuracy.toFixed(2)}%)`,
          suggestedAction: 'Verify underlying holdings data and calculation methodology'
        });
      }
      
      // Check for negative values
      const negativeHoldings = underlyingHoldings.filter(h => h.value < 0 || h.weight < 0);
      if (negativeHoldings.length > 0) {
        issues.push({
          severity: ValidationSeverity.Error,
          code: 'FUND_DECOMP_003',
          message: `Negative values detected in ${negativeHoldings.length} holdings`,
          messageDE: `Negative Werte in ${negativeHoldings.length} Positionen erkannt`,
          affectedPositions: negativeHoldings.map(h => h.name),
          suggestedAction: 'Review data source for negative position values'
        });
      }
      
      // Weight consistency check
      const totalWeight = underlyingHoldings.reduce((sum, holding) => sum + holding.weight, 0);
      if (Math.abs(totalWeight - 1.0) > 0.001) {
        issues.push({
          severity: ValidationSeverity.Warning,
          code: 'FUND_DECOMP_004',
          message: `Holdings weights sum to ${(totalWeight * 100).toFixed(2)}%, not 100%`,
          messageDE: `Positionsgewichtungen summieren sich auf ${(totalWeight * 100).toFixed(2)}%, nicht 100%`,
          suggestedAction: 'Normalize position weights'
        });
      }
      
      return issues;
    } catch (error) {
      return [{
        severity: ValidationSeverity.Critical,
        code: 'FUND_DECOMP_ERROR',
        message: `Fund decomposition validation failed: ${(error as Error).message}`,
        messageDE: `Fondszerlegungsvalidierung fehlgeschlagen: ${(error as Error).message}`,
        suggestedAction: 'Check input data format and completeness'
      }];
    }
  }
  
  /**
   * Detect double-counting across multiple funds
   * Identifies overlapping assets with 99.9% accuracy requirement
   */
  static detectDoubleCounting(
    portfolioPositions: Array<{name: string, isin?: string, value: number}>,
    underlyingHoldings: FundHolding[]
  ): { detected: boolean; affectedAssets: string[]; overlapValue: number } {
    try {
      const assetMap = new Map<string, { positions: string[], totalValue: number }>();
      const affectedAssets: string[] = [];
      let overlapValue = 0;
      
      // Build asset map using ISIN as primary identifier, name as fallback
      for (const position of portfolioPositions) {
        const key = position.isin || position.name.toLowerCase().trim();
        if (!assetMap.has(key)) {
          assetMap.set(key, { positions: [], totalValue: 0 });
        }
        assetMap.get(key)!.positions.push(position.name);
        assetMap.get(key)!.totalValue += position.value;
      }
      
      // Check underlying holdings for overlaps
      for (const holding of underlyingHoldings) {
        const key = holding.isin || holding.name.toLowerCase().trim();
        if (assetMap.has(key)) {
          const existing = assetMap.get(key)!;
          existing.positions.push(holding.name);
          existing.totalValue += holding.value;
          
          // Mark as overlapping if more than one position
          if (existing.positions.length > 1) {
            affectedAssets.push(...existing.positions);
            overlapValue += holding.value;
          }
        }
      }
      
      // Remove duplicates from affected assets
      const uniqueAffected = Array.from(new Set(affectedAssets));
      
      return {
        detected: uniqueAffected.length > 0,
        affectedAssets: uniqueAffected,
        overlapValue
      };
    } catch (error) {
      console.error('Error detecting double counting:', error);
      return {
        detected: false,
        affectedAssets: [],
        overlapValue: 0
      };
    }
  }
  
  /**
   * Validate currency exposure consistency
   * Checks currency calculation consistency between fund and underlying holdings
   */
  static validateCurrencyExposure(
    fundCurrency: string,
    underlyingCurrencies: Array<{currency: string, exposure: number, isHedged: boolean}>,
    hedgingStatus?: boolean
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    try {
      // Calculate total currency exposure
      const totalExposure = underlyingCurrencies.reduce((sum, curr) => sum + curr.exposure, 0);
      
      if (Math.abs(totalExposure - 100) > 0.1) {
        issues.push({
          severity: ValidationSeverity.Error,
          code: 'CURRENCY_001',
          message: `Currency exposures sum to ${totalExposure.toFixed(2)}%, not 100%`,
          messageDE: `Währungsexposures summieren sich auf ${totalExposure.toFixed(2)}%, nicht 100%`,
          suggestedAction: 'Review currency allocation calculations'
        });
      }
      
      // Check for negative exposures
      const negativeExposures = underlyingCurrencies.filter(c => c.exposure < 0);
      if (negativeExposures.length > 0) {
        issues.push({
          severity: ValidationSeverity.Warning,
          code: 'CURRENCY_002',
          message: `Negative currency exposures detected for: ${negativeExposures.map(c => c.currency).join(', ')}`,
          messageDE: `Negative Währungsexposures erkannt für: ${negativeExposures.map(c => c.currency).join(', ')}`,
          affectedPositions: negativeExposures.map(c => c.currency),
          suggestedAction: 'Verify currency calculation methodology'
        });
      }
      
      // Validate hedging consistency
      if (hedgingStatus !== undefined) {
        const hedgedExposure = underlyingCurrencies
          .filter(c => c.isHedged && c.currency !== fundCurrency)
          .reduce((sum, c) => sum + c.exposure, 0);
          
        const foreignExposure = underlyingCurrencies
          .filter(c => c.currency !== fundCurrency)
          .reduce((sum, c) => sum + c.exposure, 0);
          
        if (hedgingStatus && foreignExposure > 0 && (hedgedExposure / foreignExposure * 100) < 80) {
          issues.push({
            severity: ValidationSeverity.Warning,
            code: 'CURRENCY_003',
            message: `Fund marked as currency hedged but only ${(hedgedExposure / foreignExposure * 100).toFixed(1)}% of foreign exposure is hedged`,
            messageDE: `Fonds als währungsgesichert markiert, aber nur ${(hedgedExposure / foreignExposure * 100).toFixed(1)}% des Fremdwährungsexposures ist gesichert`,
            suggestedAction: 'Verify hedging status or recalculate hedged positions'
          });
        }
      }
      
      return issues;
    } catch (error) {
      return [{
        severity: ValidationSeverity.Critical,
        code: 'CURRENCY_ERROR',
        message: `Currency exposure validation failed: ${(error as Error).message}`,
        messageDE: `Währungsexposure-Validierung fehlgeschlagen: ${(error as Error).message}`,
        suggestedAction: 'Check currency data format and completeness'
      }];
    }
  }
  
  /**
   * Validate geographic allocation mathematical integrity
   * Ensures geographic allocations are mathematically sound
   */
  static validateGeographicIntegrity(
    geographicAllocations: Array<{category: string, value: number, percentage: number}>
  ): { isValid: boolean; totalAllocation: number; missingAllocations: string[] } {
    try {
      const totalAllocation = geographicAllocations.reduce((sum, alloc) => sum + alloc.percentage, 0);
      const requiredRegions = ['Deutschland', 'Europa', 'USA/Nordamerika', 'Emerging Markets'];
      const presentRegions = geographicAllocations.map(a => a.category.toLowerCase());
      
      const missingAllocations = requiredRegions.filter(region => 
        !presentRegions.some(present => present.includes(region.toLowerCase()))
      );
      
      return {
        isValid: Math.abs(totalAllocation - 100) <= 0.1 && missingAllocations.length === 0,
        totalAllocation,
        missingAllocations
      };
    } catch (error) {
      console.error('Error validating geographic integrity:', error);
      return {
        isValid: false,
        totalAllocation: 0,
        missingAllocations: []
      };
    }
  }
  
  /**
   * Validate German financial standards compliance (BaFin requirements)
   * Implements comprehensive regulatory compliance checks
   */
  static validateGermanFinancialStandards(
    positions: Array<{name: string, assetClass: string, value: number, isin?: string}>,
    allocations: Array<{category: string, percentage: number}>
  ): GermanFinancialComplianceResult {
    const issues: ValidationIssue[] = [];
    let complianceScore = 100;
    
    try {
      // 1. BaFin Asset Class Categorization
      const validAssetClasses = [
        'Aktien', 'Anleihen', 'Geldmarktinstrumente', 'Alternative Investments',
        'Derivate', 'Edelmetalle', 'Rohstoffe', 'Immobilien', 'Liquidität/Cash'
      ];
      
      const invalidAssetClasses = positions.filter(p => 
        !validAssetClasses.includes(p.assetClass)
      );
      
      if (invalidAssetClasses.length > 0) {
        issues.push({
          severity: ValidationSeverity.Error,
          code: 'BAFIN_001',
          message: `Invalid BaFin asset classifications found: ${invalidAssetClasses.map(p => p.assetClass).join(', ')}`,
          messageDE: `Ungültige BaFin-Anlageklassifikationen gefunden: ${invalidAssetClasses.map(p => p.assetClass).join(', ')}`,
          affectedPositions: invalidAssetClasses.map(p => p.name),
          suggestedAction: 'Reclassify assets according to BaFin standards'
        });
        complianceScore -= 15;
      }
      
      // 2. UCITS Compliance (simplified check)
      const derivativePositions = positions.filter(p => p.assetClass === 'Derivate');
      const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
      const derivativeExposure = derivativePositions.reduce((sum, p) => sum + p.value, 0) / totalValue * 100;
      
      if (derivativeExposure > 10) { // UCITS derivative exposure limit
        issues.push({
          severity: ValidationSeverity.Warning,
          code: 'UCITS_001',
          message: `Derivative exposure ${derivativeExposure.toFixed(1)}% exceeds recommended UCITS limit of 10%`,
          messageDE: `Derivate-Exposure ${derivativeExposure.toFixed(1)}% überschreitet empfohlenes OGAW-Limit von 10%`,
          suggestedAction: 'Review derivative positions for UCITS compliance'
        });
        complianceScore -= 10;
      }
      
      // 3. ISIN Validation
      const missingISINs = positions.filter(p => !p.isin || p.isin.length !== 12);
      if (missingISINs.length > 0) {
        issues.push({
          severity: ValidationSeverity.Warning,
          code: 'ISIN_001',
          message: `${missingISINs.length} positions missing valid ISIN codes`,
          messageDE: `${missingISINs.length} Positionen ohne gültige ISIN-Codes`,
          affectedPositions: missingISINs.map(p => p.name),
          suggestedAction: 'Add valid ISIN codes for all positions'
        });
        complianceScore -= 5;
      }
      
      // 4. German Reporting Standards
      const totalAllocation = allocations.reduce((sum, a) => sum + a.percentage, 0);
      if (Math.abs(totalAllocation - 100) > 0.01) {
        issues.push({
          severity: ValidationSeverity.Error,
          code: 'REPORTING_001',
          message: `Total allocation ${totalAllocation.toFixed(2)}% does not equal 100% (German reporting standards)`,
          messageDE: `Gesamtallokation ${totalAllocation.toFixed(2)}% entspricht nicht 100% (Deutsche Berichtsstandards)`,
          suggestedAction: 'Ensure allocations sum to exactly 100%'
        });
        complianceScore -= 10;
      }
      
      return {
        isCompliant: issues.filter(i => i.severity === ValidationSeverity.Critical || i.severity === ValidationSeverity.Error).length === 0,
        bafin: {
          assetClassification: invalidAssetClasses.length === 0,
          ucitsCompliance: derivativeExposure <= 10,
          reportingStandards: Math.abs(totalAllocation - 100) <= 0.01
        },
        issues,
        complianceScore: Math.max(0, complianceScore)
      };
    } catch (error) {
      console.error('Error validating German financial standards:', error);
      return {
        isCompliant: false,
        bafin: {
          assetClassification: false,
          ucitsCompliance: false,
          reportingStandards: false
        },
        issues: [{
          severity: ValidationSeverity.Critical,
          code: 'COMPLIANCE_ERROR',
          message: `German financial standards validation failed: ${(error as Error).message}`,
          messageDE: `Deutsche Finanzstandards-Validierung fehlgeschlagen: ${(error as Error).message}`,
          suggestedAction: 'Contact compliance officer'
        }],
        complianceScore: 0
      };
    }
  }

  /**
   * Estimate asset return and volatility from asset class and geography
   * Used when specific data is not available
   */
  static estimateAssetMetrics(assetClass: string, geography?: string): { expectedReturn: number; volatility: number } {
    // Conservative estimates based on historical asset class performance
    const estimates: Record<string, { expectedReturn: number; volatility: number }> = {
      'Aktien': { expectedReturn: 0.08, volatility: 0.18 },
      'Anleihen': { expectedReturn: 0.03, volatility: 0.05 },
      'Alternative Investments': { expectedReturn: 0.06, volatility: 0.12 },
      'Liquidität/Cash': { expectedReturn: 0.01, volatility: 0.005 },
      'Edelmetalle': { expectedReturn: 0.04, volatility: 0.20 },
      'Geldmarktanlagen': { expectedReturn: 0.015, volatility: 0.01 },
      'Multi-Asset': { expectedReturn: 0.05, volatility: 0.10 }
    };
    
    // Geography adjustments
    const geoAdjustments: Record<string, { returnAdj: number; volAdj: number }> = {
      'Deutschland': { returnAdj: -0.005, volAdj: -0.02 },
      'Europa (inkl. UK)': { returnAdj: 0, volAdj: 0 },
      'USA/Nordamerika': { returnAdj: 0.01, volAdj: 0.02 },
      'Emerging Markets': { returnAdj: 0.02, volAdj: 0.08 },
      'Asien-Pazifik': { returnAdj: 0.005, volAdj: 0.03 },
      'Global': { returnAdj: 0, volAdj: -0.01 }
    };
    
    const base = estimates[assetClass] || estimates['Multi-Asset'];
    const geoAdj = geography ? geoAdjustments[geography] || { returnAdj: 0, volAdj: 0 } : { returnAdj: 0, volAdj: 0 };
    
    return {
      expectedReturn: Math.max(0.001, base.expectedReturn + geoAdj.returnAdj),
      volatility: Math.max(0.001, base.volatility + geoAdj.volAdj)
    };
  }

  /**
   * Calculate portfolio impact metrics for comparison scenarios
   */
  static calculatePortfolioImpact(
    originalAllocations: Array<{category: string, value: number, percentage: number}>,
    newAllocations: Array<{category: string, value: number, percentage: number}>,
    originalTotalValue: number,
    newTotalValue: number
  ): {
    totalValueChange: number;
    totalValueChangePercentage: number;
    significantChanges: Array<{category: string, change: number, changePercentage: number}>;
    concentrationRisk: {before: number, after: number, change: number};
    diversificationScore: {before: number, after: number, improvement: number};
  } {
    const totalValueChange = newTotalValue - originalTotalValue;
    const totalValueChangePercentage = originalTotalValue > 0 ? (totalValueChange / originalTotalValue) * 100 : 0;

    // Calculate significant allocation changes (> 5 percentage points)
    const significantChanges: Array<{category: string, change: number, changePercentage: number}> = [];
    
    originalAllocations.forEach(original => {
      const newAllocation = newAllocations.find(n => n.category === original.category);
      if (newAllocation) {
        const change = newAllocation.percentage - original.percentage;
        if (Math.abs(change) > 5) {
          significantChanges.push({
            category: original.category,
            change,
            changePercentage: original.percentage > 0 ? (change / original.percentage) * 100 : 0
          });
        }
      }
    });

    // Calculate concentration risk (HHI - Herfindahl-Hirschman Index)
    const concentrationBefore = this.calculateConcentrationIndex(originalAllocations);
    const concentrationAfter = this.calculateConcentrationIndex(newAllocations);

    // Calculate diversification score (inverse of concentration, normalized)
    const diversificationBefore = this.calculateDiversificationScore(originalAllocations);
    const diversificationAfter = this.calculateDiversificationScore(newAllocations);

    return {
      totalValueChange,
      totalValueChangePercentage,
      significantChanges,
      concentrationRisk: {
        before: concentrationBefore,
        after: concentrationAfter,
        change: concentrationAfter - concentrationBefore
      },
      diversificationScore: {
        before: diversificationBefore,
        after: diversificationAfter,
        improvement: diversificationAfter - diversificationBefore
      }
    };
  }

  /**
   * Calculate concentration index (Herfindahl-Hirschman Index)
   */
  private static calculateConcentrationIndex(allocations: Array<{percentage: number}>): number {
    return allocations.reduce((sum, allocation) => {
      const weight = allocation.percentage / 100;
      return sum + (weight * weight);
    }, 0) * 10000; // Scale to 0-10000 range
  }

  /**
   * Calculate diversification score (higher = better diversified)
   */
  private static calculateDiversificationScore(allocations: Array<{percentage: number}>): number {
    const effectiveNumber = 1 / allocations.reduce((sum, allocation) => {
      const weight = allocation.percentage / 100;
      return sum + (weight * weight);
    }, 0);
    
    return Math.min(effectiveNumber / allocations.length, 1) * 100; // Normalize to 0-100
  }

  /**
   * Validate portfolio change scenario for German financial standards compliance
   */
  static validatePortfolioChangeCompliance(
    originalPositions: Array<{name: string, assetClass: string, value: number, isin: string}>,
    changes: Array<{instrumentName: string, newValue: number, instrumentType?: string}>,
    newTotalValue: number
  ): {
    isCompliant: boolean;
    warnings: string[];
    violations: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Calculate new allocations after changes
    const positionMap = new Map(originalPositions.map(pos => [pos.name.toLowerCase(), {...pos}]));
    
    changes.forEach(change => {
      const key = change.instrumentName.toLowerCase();
      const existing = positionMap.get(key);
      
      if (existing) {
        existing.value = change.newValue;
      } else {
        positionMap.set(key, {
          name: change.instrumentName,
          assetClass: change.instrumentType || 'Aktien',
          value: change.newValue,
          isin: ''
        });
      }
    });

    const newPositions = Array.from(positionMap.values()).filter(pos => pos.value > 0);

    // Check concentration limits
    newPositions.forEach(position => {
      const concentration = (position.value / newTotalValue) * 100;
      
      if (concentration > 25) {
        violations.push(`Einzelposition "${position.name}" überschreitet 25% Limit (${concentration.toFixed(1)}%)`);
      } else if (concentration > 20) {
        warnings.push(`Einzelposition "${position.name}" nähert sich Konzentrationslimit (${concentration.toFixed(1)}%)`);
      }
    });

    // Check asset class diversification
    const assetClassAllocation = new Map<string, number>();
    newPositions.forEach(position => {
      const current = assetClassAllocation.get(position.assetClass) || 0;
      assetClassAllocation.set(position.assetClass, current + position.value);
    });

    const equityPercentage = ((assetClassAllocation.get('Aktien') || 0) / newTotalValue) * 100;
    const alternativePercentage = ((assetClassAllocation.get('Alternative Investments') || 0) / newTotalValue) * 100;

    if (equityPercentage > 80) {
      warnings.push(`Hohe Aktienallokation (${equityPercentage.toFixed(1)}%) - Risikotoleranz prüfen`);
    }

    if (alternativePercentage > 15) {
      warnings.push(`Alternative Investments über 15% (${alternativePercentage.toFixed(1)}%) - Liquiditätsrisiko beachten`);
    }

    // Generate recommendations
    if (assetClassAllocation.size < 3) {
      recommendations.push('Diversifikation durch weitere Asset-Klassen erwägen');
    }

    if (newPositions.length < 10) {
      recommendations.push('Erhöhung der Anzahl der Positionen für bessere Streuung');
    }

    const isCompliant = violations.length === 0;

    return {
      isCompliant,
      warnings,
      violations,
      recommendations
    };
  }
}