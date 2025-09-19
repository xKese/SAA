import { describe, it, expect } from 'vitest';
import { PortfolioMathematics, AssetData } from '../../server/utils/portfolio-mathematics';

describe('Portfolio Mathematics Unit Tests', () => {
  describe('Expected Return Calculation', () => {
    it('should calculate weighted portfolio expected return correctly', () => {
      const assets: AssetData[] = [
        { name: 'Asset A', expectedReturn: 0.08, volatility: 0.15, weight: 0.6, value: 60000 },
        { name: 'Asset B', expectedReturn: 0.05, volatility: 0.10, weight: 0.4, value: 40000 }
      ];

      const expectedReturn = PortfolioMathematics.calculateExpectedReturn(assets);
      
      // Expected: 0.6 * 0.08 + 0.4 * 0.05 = 0.048 + 0.02 = 0.068 (6.8%)
      expect(expectedReturn).toBeCloseTo(0.068, 3);
    });

    it('should normalize weights if they do not sum to 1', () => {
      const assets: AssetData[] = [
        { name: 'Asset A', expectedReturn: 0.08, volatility: 0.15, weight: 0.3, value: 30000 },
        { name: 'Asset B', expectedReturn: 0.05, volatility: 0.10, weight: 0.2, value: 20000 }
      ];

      const expectedReturn = PortfolioMathematics.calculateExpectedReturn(assets);
      
      // Normalized weights: 0.3/0.5 = 0.6, 0.2/0.5 = 0.4
      // Expected: 0.6 * 0.08 + 0.4 * 0.05 = 0.068 (6.8%)
      expect(expectedReturn).toBeCloseTo(0.068, 3);
    });
  });

  describe('Volatility Calculation', () => {
    it('should calculate simple volatility when correlation matrix is unavailable', () => {
      const assets: AssetData[] = [
        { name: 'Asset A', expectedReturn: 0.08, volatility: 0.20, weight: 0.7, value: 70000 },
        { name: 'Asset B', expectedReturn: 0.05, volatility: 0.10, weight: 0.3, value: 30000 }
      ];

      const volatility = PortfolioMathematics.calculateSimpleVolatility(assets);
      
      // Expected: 0.7 * 0.20 + 0.3 * 0.10 = 0.14 + 0.03 = 0.17 (17%)
      expect(volatility).toBeCloseTo(0.17, 3);
    });

    it('should calculate portfolio volatility with correlation matrix', () => {
      const assets: AssetData[] = [
        { name: 'Asset A', expectedReturn: 0.08, volatility: 0.20, weight: 0.5, value: 50000 },
        { name: 'Asset B', expectedReturn: 0.05, volatility: 0.10, weight: 0.5, value: 50000 }
      ];

      const correlationMatrix = [
        [1.0, 0.3],
        [0.3, 1.0]
      ];

      const volatility = PortfolioMathematics.calculatePortfolioVolatility(assets, correlationMatrix);
      
      // Expected: sqrt(0.5² * 0.20² + 0.5² * 0.10² + 2 * 0.5 * 0.5 * 0.20 * 0.10 * 0.3)
      // = sqrt(0.25 * 0.04 + 0.25 * 0.01 + 2 * 0.25 * 0.20 * 0.10 * 0.3)
      // = sqrt(0.01 + 0.0025 + 0.003) = sqrt(0.0155) ≈ 0.1245
      expect(volatility).toBeCloseTo(0.1245, 3);
    });

    it('should fallback to simple calculation when correlation matrix is invalid', () => {
      const assets: AssetData[] = [
        { name: 'Asset A', expectedReturn: 0.08, volatility: 0.20, weight: 0.6, value: 60000 },
        { name: 'Asset B', expectedReturn: 0.05, volatility: 0.10, weight: 0.4, value: 40000 }
      ];

      const invalidMatrix = [[1.0]]; // Wrong size

      const volatility = PortfolioMathematics.calculatePortfolioVolatility(assets, invalidMatrix);
      
      // Should fall back to simple calculation: 0.6 * 0.20 + 0.4 * 0.10 = 0.16
      expect(volatility).toBeCloseTo(0.16, 3);
    });
  });

  describe('Sharpe Ratio Calculation', () => {
    it('should calculate Sharpe ratio correctly', () => {
      const expectedReturn = 0.08; // 8%
      const volatility = 0.15; // 15%
      const riskFreeRate = 0.025; // 2.5%

      const sharpeRatio = PortfolioMathematics.calculateSharpeRatio(expectedReturn, volatility, riskFreeRate);
      
      // Expected: (0.08 - 0.025) / 0.15 = 0.055 / 0.15 ≈ 0.367
      expect(sharpeRatio).toBeCloseTo(0.367, 3);
    });

    it('should use default risk-free rate when not provided', () => {
      const expectedReturn = 0.08;
      const volatility = 0.15;

      const sharpeRatio = PortfolioMathematics.calculateSharpeRatio(expectedReturn, volatility);
      
      // Using default risk-free rate of 2.5%
      expect(sharpeRatio).toBeCloseTo(0.367, 3);
    });

    it('should return 0 when volatility is zero or negative', () => {
      const expectedReturn = 0.08;
      const volatility = 0;

      const sharpeRatio = PortfolioMathematics.calculateSharpeRatio(expectedReturn, volatility);
      
      expect(sharpeRatio).toBe(0);
    });
  });

  describe('Value-at-Risk (VaR) Calculation', () => {
    it('should calculate 95% VaR correctly', () => {
      const expectedReturn = 0.08; // 8% annual
      const volatility = 0.15; // 15% annual

      const var95 = PortfolioMathematics.calculateVaR(expectedReturn, volatility, 0.05, 1);
      
      // For 95% confidence: VaR = 0.08 - 1.645 * 0.15 = 0.08 - 0.24675 = -0.16675
      // Returned as positive loss: 0.16675
      expect(var95).toBeCloseTo(0.167, 2);
    });

    it('should adjust for different time horizons', () => {
      const expectedReturn = 0.08;
      const volatility = 0.15;
      const timeHorizon = 0.25; // 3 months

      const var95 = PortfolioMathematics.calculateVaR(expectedReturn, volatility, 0.05, timeHorizon);
      
      // Adjusted return: 0.08 * 0.25 = 0.02
      // Adjusted volatility: 0.15 * sqrt(0.25) = 0.15 * 0.5 = 0.075
      // VaR = 0.02 - 1.645 * 0.075 ≈ -0.103
      expect(var95).toBeCloseTo(0.103, 2);
    });
  });

  describe('Expected Shortfall Calculation', () => {
    it('should calculate Expected Shortfall correctly', () => {
      const expectedReturn = 0.08;
      const volatility = 0.15;

      const es = PortfolioMathematics.calculateExpectedShortfall(expectedReturn, volatility, 0.05, 1);
      
      // ES should be higher than VaR (approximately 1.25x for normal distribution)
      const var95 = PortfolioMathematics.calculateVaR(expectedReturn, volatility, 0.05, 1);
      expect(es).toBeGreaterThan(var95);
    });
  });

  describe('Max Drawdown Calculation', () => {
    it('should estimate maximum drawdown', () => {
      const volatility = 0.15; // 15%

      const maxDrawdown = PortfolioMathematics.calculateMaxDrawdown(volatility, 1);
      
      // Conservative estimate: 2.5 * volatility = 2.5 * 0.15 = 0.375
      expect(maxDrawdown).toBeCloseTo(0.375, 3);
    });
  });

  describe('Diversification Ratio Calculation', () => {
    it('should calculate diversification ratio correctly', () => {
      const assets: AssetData[] = [
        { name: 'Asset A', expectedReturn: 0.08, volatility: 0.20, weight: 0.6, value: 60000 },
        { name: 'Asset B', expectedReturn: 0.05, volatility: 0.10, weight: 0.4, value: 40000 }
      ];
      
      const portfolioVolatility = 0.14; // Assume some diversification benefit

      const diversificationRatio = PortfolioMathematics.calculateDiversificationRatio(assets, portfolioVolatility);
      
      // Weighted average volatility: 0.6 * 0.20 + 0.4 * 0.10 = 0.16
      // Diversification ratio: 0.16 / 0.14 ≈ 1.14
      expect(diversificationRatio).toBeCloseTo(1.14, 2);
    });

    it('should return 1.0 when portfolio volatility is zero', () => {
      const assets: AssetData[] = [
        { name: 'Asset A', expectedReturn: 0.08, volatility: 0.20, weight: 1.0, value: 100000 }
      ];

      const diversificationRatio = PortfolioMathematics.calculateDiversificationRatio(assets, 0);
      
      expect(diversificationRatio).toBe(1.0);
    });
  });

  describe('Asset Metrics Estimation', () => {
    it('should provide reasonable estimates for different asset classes', () => {
      const equityMetrics = PortfolioMathematics.estimateAssetMetrics('Aktien');
      expect(equityMetrics.expectedReturn).toBeGreaterThan(0.05);
      expect(equityMetrics.volatility).toBeGreaterThan(0.10);

      const bondMetrics = PortfolioMathematics.estimateAssetMetrics('Anleihen');
      expect(bondMetrics.expectedReturn).toBeLessThan(equityMetrics.expectedReturn);
      expect(bondMetrics.volatility).toBeLessThan(equityMetrics.volatility);

      const cashMetrics = PortfolioMathematics.estimateAssetMetrics('Liquidität/Cash');
      expect(cashMetrics.expectedReturn).toBeLessThan(bondMetrics.expectedReturn);
      expect(cashMetrics.volatility).toBeLessThan(bondMetrics.volatility);
    });

    it('should apply geographic adjustments', () => {
      const germanEquity = PortfolioMathematics.estimateAssetMetrics('Aktien', 'Deutschland');
      const usEquity = PortfolioMathematics.estimateAssetMetrics('Aktien', 'USA/Nordamerika');
      const emergingEquity = PortfolioMathematics.estimateAssetMetrics('Aktien', 'Emerging Markets');

      // US should have higher expected return than German
      expect(usEquity.expectedReturn).toBeGreaterThan(germanEquity.expectedReturn);
      
      // Emerging markets should have higher expected return but also higher volatility
      expect(emergingEquity.expectedReturn).toBeGreaterThan(usEquity.expectedReturn);
      expect(emergingEquity.volatility).toBeGreaterThan(usEquity.volatility);
    });
  });

  describe('Look-Through Analysis Validation', () => {
    it('should validate consistent allocations', () => {
      const originalAllocations = [
        { category: 'Aktien', value: 60000, percentage: 60.0 },
        { category: 'Anleihen', value: 40000, percentage: 40.0 }
      ];

      const lookThroughAllocations = [
        { category: 'Aktien', value: 60000, percentage: 60.0 },
        { category: 'Anleihen', value: 40000, percentage: 40.0 }
      ];

      const validation = PortfolioMathematics.validateLookThroughAnalysis(
        originalAllocations,
        lookThroughAllocations
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.totalValueDifference).toBeCloseTo(0, 2);
    });

    it('should detect value mismatches', () => {
      const originalAllocations = [
        { category: 'Aktien', value: 60000, percentage: 60.0 },
        { category: 'Anleihen', value: 40000, percentage: 40.0 }
      ];

      const lookThroughAllocations = [
        { category: 'Aktien', value: 55000, percentage: 55.0 },
        { category: 'Anleihen', value: 40000, percentage: 40.0 }
      ];

      const validation = PortfolioMathematics.validateLookThroughAnalysis(
        originalAllocations,
        lookThroughAllocations
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.totalValueDifference).toBeGreaterThan(0);
    });

    it('should detect percentage inconsistencies', () => {
      const allocations = [
        { category: 'Aktien', value: 60000, percentage: 65.0 }, // Wrong percentage
        { category: 'Anleihen', value: 40000, percentage: 40.0 }
      ];

      const validation = PortfolioMathematics.validateLookThroughAnalysis(allocations, allocations);

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some(w => w.includes('Value-percentage mismatch'))).toBe(true);
    });
  });

  describe('Complete Risk Metrics Calculation', () => {
    it('should calculate all risk metrics for a valid portfolio', () => {
      const assets: AssetData[] = [
        { 
          name: 'German Equity', 
          expectedReturn: 0.07, 
          volatility: 0.18, 
          weight: 0.4, 
          value: 40000 
        },
        { 
          name: 'US Equity', 
          expectedReturn: 0.09, 
          volatility: 0.16, 
          weight: 0.4, 
          value: 40000 
        },
        { 
          name: 'Bonds', 
          expectedReturn: 0.03, 
          volatility: 0.05, 
          weight: 0.2, 
          value: 20000 
        }
      ];

      const riskMetrics = PortfolioMathematics.calculateRiskMetrics(assets);

      expect(riskMetrics.expectedReturn).toBeGreaterThan(0);
      expect(riskMetrics.volatility).toBeGreaterThan(0);
      expect(riskMetrics.sharpeRatio).toBeGreaterThan(0);
      expect(riskMetrics.valueAtRisk).toBeGreaterThan(0);
      expect(riskMetrics.expectedShortfall).toBeGreaterThan(riskMetrics.valueAtRisk);
      expect(riskMetrics.maxDrawdown).toBeGreaterThan(0);
      expect(riskMetrics.diversificationRatio).toBeGreaterThan(0);

      // Portfolio return should be weighted average
      const expectedPortfolioReturn = 0.4 * 0.07 + 0.4 * 0.09 + 0.2 * 0.03;
      expect(riskMetrics.expectedReturn).toBeCloseTo(expectedPortfolioReturn, 3);
    });

    it('should throw error for invalid asset data', () => {
      const invalidAssets: AssetData[] = [
        { name: 'Invalid', expectedReturn: NaN, volatility: 0.15, weight: 1.0, value: 100000 }
      ];

      expect(() => {
        PortfolioMathematics.calculateRiskMetrics(invalidAssets);
      }).toThrow('Incomplete asset data');
    });

    it('should throw error for empty portfolio', () => {
      expect(() => {
        PortfolioMathematics.calculateRiskMetrics([]);
      }).toThrow('No assets provided for risk calculation');
    });
  });

  describe('Enhanced Validation Integration Tests', () => {
    it('should maintain backward compatibility with existing risk calculations', () => {
      const assets: AssetData[] = [
        { name: 'Asset A', expectedReturn: 0.08, volatility: 0.15, weight: 0.6, value: 60000 },
        { name: 'Asset B', expectedReturn: 0.05, volatility: 0.10, weight: 0.4, value: 40000 }
      ];

      const originalMetrics = PortfolioMathematics.calculateRiskMetrics(assets);
      
      // Ensure validation integration doesn't break existing calculations
      expect(originalMetrics.expectedReturn).toBeCloseTo(0.068, 3);
      expect(originalMetrics.volatility).toBeGreaterThan(0);
      expect(originalMetrics.sharpeRatio).toBeGreaterThan(0);
    });

    it('should validate enhanced risk calculations with validation data', () => {
      const assets: AssetData[] = [
        { name: 'Enhanced Asset', expectedReturn: 0.07, volatility: 0.12, weight: 1.0, value: 100000 }
      ];

      const metrics = PortfolioMathematics.calculateRiskMetrics(assets);
      
      // Validate enhanced calculations
      expect(metrics.expectedReturn).toBe(0.07);
      expect(metrics.volatility).toBe(0.12);
      expect(metrics.diversificationRatio).toBe(1.0); // Single asset
    });

    it('should handle large portfolios with performance validation', () => {
      // Create large portfolio (100+ positions)
      const largeAssets: AssetData[] = Array.from({ length: 150 }, (_, i) => ({
        name: `Asset ${i + 1}`,
        expectedReturn: 0.05 + (i % 10) * 0.002, // Varying returns
        volatility: 0.10 + (i % 5) * 0.01, // Varying volatilities
        weight: 1 / 150, // Equal weighting
        value: 100000 / 150 // Equal value distribution
      }));

      const startTime = performance.now();
      const metrics = PortfolioMathematics.calculateRiskMetrics(largeAssets);
      const endTime = performance.now();

      // Performance test: should complete within 1 second
      expect(endTime - startTime).toBeLessThan(1000);
      
      // Validate calculations
      expect(metrics.expectedReturn).toBeGreaterThan(0);
      expect(metrics.volatility).toBeGreaterThan(0);
      expect(metrics.diversificationRatio).toBeGreaterThanOrEqual(1); // Should show some diversification benefit
    });

    it('should handle edge cases with malformed validation data', () => {
      // Test with various edge cases
      const edgeCaseAssets: AssetData[] = [
        { name: 'Zero Return', expectedReturn: 0, volatility: 0.05, weight: 0.25, value: 25000 },
        { name: 'High Vol', expectedReturn: 0.15, volatility: 0.50, weight: 0.25, value: 25000 },
        { name: 'Minimal', expectedReturn: 0.001, volatility: 0.001, weight: 0.25, value: 25000 },
        { name: 'Normal', expectedReturn: 0.06, volatility: 0.12, weight: 0.25, value: 25000 }
      ];

      const metrics = PortfolioMathematics.calculateRiskMetrics(edgeCaseAssets);
      
      expect(metrics.expectedReturn).toBeGreaterThan(0);
      expect(metrics.volatility).toBeGreaterThan(0);
      expect(isFinite(metrics.sharpeRatio)).toBe(true);
      expect(isFinite(metrics.valueAtRisk)).toBe(true);
    });

    it('should validate precision tolerance settings', () => {
      const preciseAssets: AssetData[] = [
        { 
          name: 'Precise Asset', 
          expectedReturn: 0.0800001, // Very precise return
          volatility: 0.1500001, // Very precise volatility
          weight: 0.9999999, // Almost 1.0 weight
          value: 99999.99 // Almost 100k value
        }
      ];

      const metrics = PortfolioMathematics.calculateRiskMetrics(preciseAssets);
      
      // Should handle precision correctly
      expect(metrics.expectedReturn).toBeCloseTo(0.0800001, 6);
      expect(metrics.volatility).toBeCloseTo(0.1500001, 6);
    });
  });
});