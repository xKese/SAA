/**
 * Risk Metrics Calculator
 * Calculates portfolio risk metrics according to German financial standards
 */

export interface AssetClassReturns {
  equities: number;
  bonds: number;
  alternatives: number;
  commodities: number;
  cash: number;
}

export interface AssetClassVolatilities {
  equities: number;
  bonds: number;
  alternatives: number;
  commodities: number;
  cash: number;
}

export interface PortfolioWeights {
  equities: number;
  bonds: number;
  alternatives: number;
  commodities: number;
  cash: number;
}

export interface RiskMetrics {
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  valueAtRisk95: number;
  expectedShortfall95: number;
  maximumDrawdown: number;
  diversificationQuotient: number;
}

export class RiskMetricsCalculator {
  // German risk-free rate (ECB deposit rate as of 2024)
  private static readonly GERMAN_RISK_FREE_RATE = 0.04; // 4%

  // Default expected returns (annual, in %)
  private static readonly DEFAULT_EXPECTED_RETURNS: AssetClassReturns = {
    equities: 8.0,
    bonds: 3.5,
    alternatives: 6.0,
    commodities: 4.0,
    cash: 2.0
  };

  // Default volatilities (annual, in %)
  private static readonly DEFAULT_VOLATILITIES: AssetClassVolatilities = {
    equities: 16.0,
    bonds: 5.0,
    alternatives: 10.0,
    commodities: 18.0,
    cash: 0.5
  };

  // Correlation matrix between asset classes
  private static readonly CORRELATION_MATRIX = [
    [1.00, 0.15, 0.60, 0.30, 0.00], // Equities
    [0.15, 1.00, 0.20, -0.10, 0.10], // Bonds
    [0.60, 0.20, 1.00, 0.40, 0.00], // Alternatives
    [0.30, -0.10, 0.40, 1.00, 0.00], // Commodities
    [0.00, 0.10, 0.00, 0.00, 1.00]  // Cash
  ];

  /**
   * Calculate expected portfolio return
   */
  static calculateExpectedReturn(
    weights: PortfolioWeights,
    expectedReturns: AssetClassReturns = this.DEFAULT_EXPECTED_RETURNS
  ): number {
    return (
      weights.equities * expectedReturns.equities +
      weights.bonds * expectedReturns.bonds +
      weights.alternatives * expectedReturns.alternatives +
      weights.commodities * expectedReturns.commodities +
      weights.cash * expectedReturns.cash
    ) / 100; // Convert percentage weights to decimal
  }

  /**
   * Calculate portfolio volatility using covariance matrix
   */
  static calculatePortfolioVolatility(
    weights: PortfolioWeights,
    volatilities: AssetClassVolatilities = this.DEFAULT_VOLATILITIES
  ): number {
    const w = [
      weights.equities / 100,
      weights.bonds / 100,
      weights.alternatives / 100,
      weights.commodities / 100,
      weights.cash / 100
    ];

    const vol = [
      volatilities.equities / 100,
      volatilities.bonds / 100,
      volatilities.alternatives / 100,
      volatilities.commodities / 100,
      volatilities.cash / 100
    ];

    // Calculate covariance matrix from correlation and volatilities
    let variance = 0;
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        variance += w[i] * w[j] * vol[i] * vol[j] * this.CORRELATION_MATRIX[i][j];
      }
    }

    return Math.sqrt(variance) * 100; // Convert back to percentage
  }

  /**
   * Calculate Sharpe Ratio with German risk-free rate
   */
  static calculateSharpeRatio(
    expectedReturn: number,
    volatility: number,
    riskFreeRate: number = this.GERMAN_RISK_FREE_RATE
  ): number {
    if (volatility === 0) return 0;
    return (expectedReturn - riskFreeRate) / volatility;
  }

  /**
   * Calculate Value at Risk (95% confidence, 1 year)
   * Using parametric VaR with normal distribution assumption
   */
  static calculateValueAtRisk95(
    expectedReturn: number,
    volatility: number
  ): number {
    const z95 = -1.645; // 95% confidence level z-score
    return expectedReturn + z95 * volatility;
  }

  /**
   * Calculate Expected Shortfall (Conditional VaR at 95%)
   */
  static calculateExpectedShortfall95(
    expectedReturn: number,
    volatility: number
  ): number {
    // For normal distribution, ES = μ - σ * φ(z) / Φ(z)
    // Where φ is PDF and Φ is CDF of standard normal
    const z95 = -1.645;
    const pdf95 = Math.exp(-z95 * z95 / 2) / Math.sqrt(2 * Math.PI);
    const cdf95 = 0.05; // 5% tail

    return expectedReturn - volatility * (pdf95 / cdf95);
  }

  /**
   * Calculate Maximum Drawdown
   * Estimates based on volatility and time horizon
   */
  static calculateMaximumDrawdown(
    volatility: number,
    timeHorizon: number = 1 // years
  ): number {
    // Empirical formula for maximum drawdown estimation
    // MDD ≈ -2.24 * σ * √T for normally distributed returns
    return -2.24 * volatility * Math.sqrt(timeHorizon);
  }

  /**
   * Calculate Diversification Quotient
   * Ratio of portfolio volatility to weighted average of individual volatilities
   */
  static calculateDiversificationQuotient(
    portfolioVolatility: number,
    weights: PortfolioWeights,
    volatilities: AssetClassVolatilities = this.DEFAULT_VOLATILITIES
  ): number {
    const weightedAvgVolatility = (
      weights.equities * volatilities.equities +
      weights.bonds * volatilities.bonds +
      weights.alternatives * volatilities.alternatives +
      weights.commodities * volatilities.commodities +
      weights.cash * volatilities.cash
    ) / 100;

    if (weightedAvgVolatility === 0) return 0;
    return portfolioVolatility / weightedAvgVolatility;
  }

  /**
   * Calculate all risk metrics
   */
  static calculateAllMetrics(
    weights: PortfolioWeights,
    customReturns?: AssetClassReturns,
    customVolatilities?: AssetClassVolatilities
  ): RiskMetrics {
    const expectedReturn = this.calculateExpectedReturn(weights, customReturns);
    const volatility = this.calculatePortfolioVolatility(weights, customVolatilities);
    const sharpeRatio = this.calculateSharpeRatio(expectedReturn, volatility);
    const valueAtRisk95 = this.calculateValueAtRisk95(expectedReturn, volatility);
    const expectedShortfall95 = this.calculateExpectedShortfall95(expectedReturn, volatility);
    const maximumDrawdown = this.calculateMaximumDrawdown(volatility);
    const diversificationQuotient = this.calculateDiversificationQuotient(
      volatility,
      weights,
      customVolatilities
    );

    return {
      expectedReturn,
      volatility,
      sharpeRatio,
      valueAtRisk95,
      expectedShortfall95,
      maximumDrawdown,
      diversificationQuotient
    };
  }

  /**
   * Validate risk metrics plausibility
   */
  static validateMetrics(metrics: RiskMetrics): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Expected return range: 0% - 15%
    if (metrics.expectedReturn < 0 || metrics.expectedReturn > 15) {
      errors.push(`Expected return ${metrics.expectedReturn.toFixed(2)}% outside plausible range [0%, 15%]`);
    }

    // Volatility range: 5% - 25%
    if (metrics.volatility < 5 || metrics.volatility > 25) {
      errors.push(`Volatility ${metrics.volatility.toFixed(2)}% outside plausible range [5%, 25%]`);
    }

    // Sharpe ratio range: -0.5 - 2.0
    if (metrics.sharpeRatio < -0.5 || metrics.sharpeRatio > 2.0) {
      errors.push(`Sharpe ratio ${metrics.sharpeRatio.toFixed(2)} outside plausible range [-0.5, 2.0]`);
    }

    // ES must be worse than VaR (more negative)
    if (metrics.expectedShortfall95 > metrics.valueAtRisk95) {
      errors.push(`Expected Shortfall (${metrics.expectedShortfall95.toFixed(2)}%) must be worse than VaR (${metrics.valueAtRisk95.toFixed(2)}%)`);
    }

    // Diversification quotient range: 0 - 1
    if (metrics.diversificationQuotient < 0 || metrics.diversificationQuotient > 1) {
      errors.push(`Diversification quotient ${metrics.diversificationQuotient.toFixed(2)} outside valid range [0, 1]`);
    }

    // Maximum drawdown should be negative and reasonable
    if (metrics.maximumDrawdown > 0 || metrics.maximumDrawdown < -50) {
      errors.push(`Maximum drawdown ${metrics.maximumDrawdown.toFixed(2)}% outside plausible range [-50%, 0%]`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format risk metrics for display
   */
  static formatMetrics(metrics: RiskMetrics): Array<{ name: string; value: number; unit: string }> {
    return [
      {
        name: 'Expected Return',
        value: metrics.expectedReturn,
        unit: '% p.a.'
      },
      {
        name: 'Portfolio Volatility',
        value: metrics.volatility,
        unit: '% p.a.'
      },
      {
        name: 'Sharpe Ratio',
        value: metrics.sharpeRatio,
        unit: ''
      },
      {
        name: 'Value at Risk',
        value: metrics.valueAtRisk95,
        unit: '%'
      },
      {
        name: 'Expected Shortfall',
        value: metrics.expectedShortfall95,
        unit: '%'
      },
      {
        name: 'Maximum Drawdown',
        value: metrics.maximumDrawdown,
        unit: '%'
      },
      {
        name: 'Diversification Quotient',
        value: metrics.diversificationQuotient,
        unit: ''
      }
    ];
  }

  /**
   * Calculate metrics with error recovery
   */
  static calculateWithRecovery(
    weights: PortfolioWeights,
    maxRetries: number = 3
  ): RiskMetrics | null {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < maxRetries) {
      try {
        const metrics = this.calculateAllMetrics(weights);
        const validation = this.validateMetrics(metrics);

        if (validation.isValid) {
          return metrics;
        }

        // If validation fails, try with adjusted parameters
        console.warn(`Validation failed on attempt ${attempt + 1}:`, validation.errors);
        attempt++;

        // Adjust weights slightly to retry
        const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
        if (Math.abs(totalWeight - 100) > 0.1) {
          // Normalize weights
          const factor = 100 / totalWeight;
          weights = {
            equities: weights.equities * factor,
            bonds: weights.bonds * factor,
            alternatives: weights.alternatives * factor,
            commodities: weights.commodities * factor,
            cash: weights.cash * factor
          };
        }
      } catch (error) {
        lastError = error as Error;
        attempt++;
        console.error(`Calculation error on attempt ${attempt}:`, error);
      }
    }

    console.error('Failed to calculate valid metrics after retries', lastError);
    return null;
  }
}