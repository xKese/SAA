// Risk metric calculations
export interface RiskMetrics {
  volatility: number;
  sharpeRatio: number;
  beta: number;
  alpha: number;
  maxDrawdown: number;
  valueAtRisk: number;
  conditionalVaR: number;
  skewness: number;
  kurtosis: number;
  informationRatio: number;
}

export class RiskCalculator {
  /**
   * Calculate portfolio volatility (annualized standard deviation)
   */
  static calculateVolatility(returns: number[], annualized: boolean = true): number {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    const volatility = Math.sqrt(variance);

    return annualized ? volatility * Math.sqrt(252) : volatility; // 252 trading days
  }

  /**
   * Calculate Sharpe ratio
   */
  static calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.02): number {
    const excessReturns = returns.map(r => r - riskFreeRate / 252);
    const meanExcess = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    const volatility = this.calculateVolatility(excessReturns, false);

    return (meanExcess * 252) / (volatility * Math.sqrt(252));
  }

  /**
   * Calculate beta relative to market/benchmark
   */
  static calculateBeta(returns: number[], marketReturns: number[]): number {
    if (returns.length !== marketReturns.length) {
      throw new Error('Returns arrays must have the same length');
    }

    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const meanMarket = marketReturns.reduce((sum, r) => sum + r, 0) / marketReturns.length;

    let covariance = 0;
    let marketVariance = 0;

    for (let i = 0; i < returns.length; i++) {
      covariance += (returns[i] - meanReturn) * (marketReturns[i] - meanMarket);
      marketVariance += Math.pow(marketReturns[i] - meanMarket, 2);
    }

    return covariance / marketVariance;
  }

  /**
   * Calculate alpha (Jensen's alpha)
   */
  static calculateAlpha(returns: number[], marketReturns: number[], riskFreeRate: number = 0.02): number {
    const beta = this.calculateBeta(returns, marketReturns);
    const portfolioReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length * 252;
    const marketReturn = marketReturns.reduce((sum, r) => sum + r, 0) / marketReturns.length * 252;

    return portfolioReturn - (riskFreeRate + beta * (marketReturn - riskFreeRate));
  }

  /**
   * Calculate maximum drawdown
   */
  static calculateMaxDrawdown(cumulativeReturns: number[]): number {
    let maxDrawdown = 0;
    let peak = cumulativeReturns[0];

    for (let i = 1; i < cumulativeReturns.length; i++) {
      if (cumulativeReturns[i] > peak) {
        peak = cumulativeReturns[i];
      }

      const drawdown = (peak - cumulativeReturns[i]) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  /**
   * Calculate Value at Risk (VaR) using historical method
   */
  static calculateVaR(returns: number[], confidenceLevel: number = 0.95): number {
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    return -sortedReturns[index];
  }

  /**
   * Calculate Conditional Value at Risk (Expected Shortfall)
   */
  static calculateConditionalVaR(returns: number[], confidenceLevel: number = 0.95): number {
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    const tailReturns = sortedReturns.slice(0, index + 1);

    return -tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
  }

  /**
   * Calculate skewness
   */
  static calculateSkewness(returns: number[]): number {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    const skewness = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 3), 0) / returns.length;
    return skewness;
  }

  /**
   * Calculate kurtosis
   */
  static calculateKurtosis(returns: number[]): number {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    const kurtosis = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 4), 0) / returns.length;
    return kurtosis - 3; // Excess kurtosis
  }

  /**
   * Calculate information ratio
   */
  static calculateInformationRatio(returns: number[], benchmarkReturns: number[]): number {
    if (returns.length !== benchmarkReturns.length) {
      throw new Error('Returns arrays must have the same length');
    }

    const activeReturns = returns.map((r, i) => r - benchmarkReturns[i]);
    const meanActiveReturn = activeReturns.reduce((sum, r) => sum + r, 0) / activeReturns.length;
    const trackingError = this.calculateVolatility(activeReturns, false);

    return (meanActiveReturn * 252) / (trackingError * Math.sqrt(252));
  }

  /**
   * Calculate all risk metrics for a portfolio
   */
  static calculateAllMetrics(
    returns: number[],
    marketReturns?: number[],
    benchmarkReturns?: number[],
    riskFreeRate: number = 0.02
  ): RiskMetrics {
    const cumulativeReturns = this.calculateCumulativeReturns(returns);

    return {
      volatility: this.calculateVolatility(returns),
      sharpeRatio: this.calculateSharpeRatio(returns, riskFreeRate),
      beta: marketReturns ? this.calculateBeta(returns, marketReturns) : 1,
      alpha: marketReturns ? this.calculateAlpha(returns, marketReturns, riskFreeRate) : 0,
      maxDrawdown: this.calculateMaxDrawdown(cumulativeReturns),
      valueAtRisk: this.calculateVaR(returns),
      conditionalVaR: this.calculateConditionalVaR(returns),
      skewness: this.calculateSkewness(returns),
      kurtosis: this.calculateKurtosis(returns),
      informationRatio: benchmarkReturns ? this.calculateInformationRatio(returns, benchmarkReturns) : 0,
    };
  }

  /**
   * Convert simple returns to cumulative returns
   */
  private static calculateCumulativeReturns(returns: number[]): number[] {
    const cumulative = [1]; // Start with 1 (100%)

    for (let i = 0; i < returns.length; i++) {
      cumulative.push(cumulative[cumulative.length - 1] * (1 + returns[i]));
    }

    return cumulative;
  }
}