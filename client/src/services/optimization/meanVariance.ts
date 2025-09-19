// Mean-Variance Optimization utilities
export interface MeanVarianceInputs {
  returns: number[][];
  expectedReturns: number[];
  covarianceMatrix: number[][];
  constraints: {
    minWeights: number[];
    maxWeights: number[];
    riskAversion?: number;
    targetReturn?: number;
  };
}

export interface MeanVarianceResult {
  weights: number[];
  expectedReturn: number;
  expectedRisk: number;
  sharpeRatio: number;
}

export class MeanVarianceOptimizer {
  /**
   * Calculate the optimal portfolio weights using mean-variance optimization
   */
  static optimize(inputs: MeanVarianceInputs): MeanVarianceResult {
    // This is a placeholder implementation
    // In a real application, you would use a mathematical optimization library
    // like scipy.optimize in Python or a JavaScript equivalent

    const { expectedReturns, covarianceMatrix, constraints } = inputs;
    const n = expectedReturns.length;

    // Simple equal-weight implementation as placeholder
    const weights = new Array(n).fill(1 / n);

    // Calculate portfolio metrics
    const expectedReturn = this.calculatePortfolioReturn(weights, expectedReturns);
    const expectedRisk = this.calculatePortfolioRisk(weights, covarianceMatrix);
    const sharpeRatio = expectedReturn / expectedRisk;

    return {
      weights,
      expectedReturn,
      expectedRisk,
      sharpeRatio,
    };
  }

  /**
   * Generate efficient frontier points
   */
  static generateEfficientFrontier(
    inputs: MeanVarianceInputs,
    numPoints: number = 50
  ): { returns: number[]; risks: number[]; weights: number[][] } {
    const returns: number[] = [];
    const risks: number[] = [];
    const weights: number[][] = [];

    // Placeholder implementation
    for (let i = 0; i < numPoints; i++) {
      const targetReturn = 0.05 + (i / numPoints) * 0.15; // 5% to 20% return range

      // Optimize for target return
      const result = this.optimize({
        ...inputs,
        constraints: {
          ...inputs.constraints,
          targetReturn,
        },
      });

      returns.push(result.expectedReturn);
      risks.push(result.expectedRisk);
      weights.push(result.weights);
    }

    return { returns, risks, weights };
  }

  private static calculatePortfolioReturn(weights: number[], expectedReturns: number[]): number {
    return weights.reduce((sum, weight, i) => sum + weight * expectedReturns[i], 0);
  }

  private static calculatePortfolioRisk(weights: number[], covarianceMatrix: number[][]): number {
    let variance = 0;
    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        variance += weights[i] * weights[j] * covarianceMatrix[i][j];
      }
    }
    return Math.sqrt(variance);
  }

  /**
   * Calculate covariance matrix from historical returns
   */
  static calculateCovarianceMatrix(returns: number[][]): number[][] {
    const n = returns[0].length; // number of assets
    const covariance: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

    // Calculate means
    const means = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      means[i] = returns.reduce((sum, period) => sum + period[i], 0) / returns.length;
    }

    // Calculate covariance
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let cov = 0;
        for (let t = 0; t < returns.length; t++) {
          cov += (returns[t][i] - means[i]) * (returns[t][j] - means[j]);
        }
        covariance[i][j] = cov / (returns.length - 1);
      }
    }

    return covariance;
  }

  /**
   * Calculate expected returns from historical data
   */
  static calculateExpectedReturns(returns: number[][]): number[] {
    const n = returns[0].length;
    const expectedReturns = Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      expectedReturns[i] = returns.reduce((sum, period) => sum + period[i], 0) / returns.length;
    }

    return expectedReturns;
  }
}