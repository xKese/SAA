import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PortfolioMathematics } from '../../server/utils/portfolio-mathematics';
import { portfolioChangeRequestSchema } from '../../shared/schema';

describe('Portfolio Comparison and Impact Analysis', () => {
  describe('Portfolio Impact Calculations', () => {
    it('should calculate correct impact metrics for portfolio changes', () => {
      const originalAllocations = [
        { category: 'Aktien', value: 60000, percentage: 60 },
        { category: 'Anleihen', value: 30000, percentage: 30 },
        { category: 'Liquidität/Cash', value: 10000, percentage: 10 }
      ];

      const newAllocations = [
        { category: 'Aktien', value: 70000, percentage: 70 },
        { category: 'Anleihen', value: 20000, percentage: 20 },
        { category: 'Liquidität/Cash', value: 10000, percentage: 10 }
      ];

      const impact = PortfolioMathematics.calculatePortfolioImpact(
        originalAllocations,
        newAllocations,
        100000,
        100000
      );

      expect(impact.totalValueChange).toBe(0);
      expect(impact.totalValueChangePercentage).toBe(0);
      expect(impact.significantChanges).toHaveLength(2); // Aktien +10%, Anleihen -10%
      
      const aktienChange = impact.significantChanges.find(c => c.category === 'Aktien');
      const anleihenChange = impact.significantChanges.find(c => c.category === 'Anleihen');
      
      expect(aktienChange?.change).toBe(10);
      expect(anleihenChange?.change).toBe(-10);
    });

    it('should calculate concentration risk correctly', () => {
      const highConcentration = [
        { category: 'Aktien', value: 80000, percentage: 80 },
        { category: 'Anleihen', value: 20000, percentage: 20 }
      ];

      const lowConcentration = [
        { category: 'Aktien', value: 40000, percentage: 40 },
        { category: 'Anleihen', value: 30000, percentage: 30 },
        { category: 'Liquidität/Cash', value: 20000, percentage: 20 },
        { category: 'Alternative Investments', value: 10000, percentage: 10 }
      ];

      const impact = PortfolioMathematics.calculatePortfolioImpact(
        highConcentration,
        lowConcentration,
        100000,
        100000
      );

      expect(impact.concentrationRisk.before).toBeGreaterThan(impact.concentrationRisk.after);
      expect(impact.diversificationScore.improvement).toBeGreaterThan(0);
    });

    it('should handle portfolio with increased total value', () => {
      const originalAllocations = [
        { category: 'Aktien', value: 50000, percentage: 50 },
        { category: 'Anleihen', value: 50000, percentage: 50 }
      ];

      const newAllocations = [
        { category: 'Aktien', value: 75000, percentage: 50 },
        { category: 'Anleihen', value: 75000, percentage: 50 }
      ];

      const impact = PortfolioMathematics.calculatePortfolioImpact(
        originalAllocations,
        newAllocations,
        100000,
        150000
      );

      expect(impact.totalValueChange).toBe(50000);
      expect(impact.totalValueChangePercentage).toBe(50);
      expect(impact.significantChanges).toHaveLength(0); // No percentage changes
    });
  });

  describe('Portfolio Change Compliance Validation', () => {
    it('should validate compliant portfolio changes', () => {
      const originalPositions = [
        { name: 'Apple Inc.', assetClass: 'Aktien', value: 50000, isin: 'US0378331005' },
        { name: 'BMW AG', assetClass: 'Aktien', value: 30000, isin: 'DE0005190003' },
        { name: 'Bundesanleihe', assetClass: 'Anleihen', value: 20000, isin: 'DE0001102309' }
      ];

      const changes = [
        { instrumentName: 'Apple Inc.', newValue: 25000 }, // Apple at 20.8% (25k/120k)
        { instrumentName: 'Bundesanleihe', newValue: 30000 }, // Bonds at 25% (30k/120k)
        { instrumentName: 'SAP AG', newValue: 25000, instrumentType: 'Aktien' }, // Add new position at 20.8%
        { instrumentName: 'Siemens AG', newValue: 10000, instrumentType: 'Aktien' } // Add another position at 8.3%
      ];

      const result = PortfolioMathematics.validatePortfolioChangeCompliance(
        originalPositions,
        changes,
        120000 // Apple=25k, BMW=30k, Bonds=30k, SAP=25k, Siemens=10k = 120k total
      );

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect concentration violations', () => {
      const originalPositions = [
        { name: 'Apple Inc.', assetClass: 'Aktien', value: 50000, isin: 'US0378331005' },
        { name: 'BMW AG', assetClass: 'Aktien', value: 30000, isin: 'DE0005190003' }
      ];

      const changes = [
        { instrumentName: 'Apple Inc.', newValue: 80000 } // 80% concentration, BMW becomes 30%
      ];

      const result = PortfolioMathematics.validatePortfolioChangeCompliance(
        originalPositions,
        changes,
        110000 // Apple=80k, BMW=30k
      );

      expect(result.isCompliant).toBe(false);
      expect(result.violations).toHaveLength(2); // Both Apple (72.7%) and BMW (27.3%) exceed 25%
      expect(result.violations[0]).toContain('25% Limit');
    });

    it('should warn about high equity allocation', () => {
      const originalPositions = [
        { name: 'Apple Inc.', assetClass: 'Aktien', value: 20000, isin: 'US0378331005' },
        { name: 'BMW AG', assetClass: 'Aktien', value: 20000, isin: 'DE0005190003' },
        { name: 'Tesla Inc.', assetClass: 'Aktien', value: 20000, isin: 'US88160R1014' },
        { name: 'SAP AG', assetClass: 'Aktien', value: 20000, isin: 'DE0007164600' },
        { name: 'Bundesanleihe', assetClass: 'Anleihen', value: 10000, isin: 'DE0001102309' }
      ];

      const changes = [
        { instrumentName: 'Tesla Inc.', newValue: 22000 }, // Slightly increase Tesla to trigger 82% equity
        { instrumentName: 'Bundesanleihe', newValue: 8000 } // Reduce bonds
      ];

      const result = PortfolioMathematics.validatePortfolioChangeCompliance(
        originalPositions,
        changes,
        90000 // Apple=20k(22%), BMW=20k(22%), Tesla=22k(24%), SAP=20k(22%), Bonds=8k(9%) = 90k total, 82k equity = 91%
      );

      expect(result.isCompliant).toBe(true);
      expect(result.warnings.some(w => w.includes('Hohe Aktienallokation'))).toBe(true); // 91% equity > 80%
    });

    it('should recommend diversification improvements', () => {
      const originalPositions = [
        { name: 'Apple Inc.', assetClass: 'Aktien', value: 100000, isin: 'US0378331005' }
      ];

      const changes = [
        { instrumentName: 'Apple Inc.', newValue: 100000 }
      ];

      const result = PortfolioMathematics.validatePortfolioChangeCompliance(
        originalPositions,
        changes,
        100000
      );

      expect(result.recommendations).toContain('Diversifikation durch weitere Asset-Klassen erwägen');
      expect(result.recommendations).toContain('Erhöhung der Anzahl der Positionen für bessere Streuung');
    });
  });

  describe('Portfolio Change Request Schema Validation', () => {
    it('should validate correct portfolio change request', () => {
      const validRequest = {
        changeType: 'buy',
        changes: [
          {
            instrumentName: 'Apple Inc.',
            isin: 'US0378331005',
            currentValue: 50000,
            newValue: 60000,
            changeAmount: 10000,
            instrumentType: 'Aktie'
          }
        ],
        scenarioName: 'Test Scenario'
      };

      const result = portfolioChangeRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject invalid change type', () => {
      const invalidRequest = {
        changeType: 'invalid',
        changes: [
          {
            instrumentName: 'Apple Inc.',
            newValue: 60000,
            changeAmount: 10000
          }
        ]
      };

      const result = portfolioChangeRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should require essential fields', () => {
      const incompleteRequest = {
        changeType: 'buy',
        changes: [
          {
            instrumentName: 'Apple Inc.'
            // Missing newValue and changeAmount
          }
        ]
      };

      const result = portfolioChangeRequestSchema.safeParse(incompleteRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete portfolio transformation scenario', () => {
      // Original portfolio: 100% cash
      const originalAllocations = [
        { category: 'Liquidität/Cash', value: 100000, percentage: 100 }
      ];

      // Target portfolio: diversified
      const newAllocations = [
        { category: 'Aktien', value: 60000, percentage: 60 },
        { category: 'Anleihen', value: 30000, percentage: 30 },
        { category: 'Liquidität/Cash', value: 10000, percentage: 10 }
      ];

      const impact = PortfolioMathematics.calculatePortfolioImpact(
        originalAllocations,
        newAllocations,
        100000,
        100000
      );

      expect(impact.significantChanges.length).toBeGreaterThan(0);
      expect(Math.abs(impact.diversificationScore.improvement)).toBeGreaterThan(0); // Any change in diversification
      expect(impact.concentrationRisk.change).not.toBe(0); // Should have some concentration change
    });

    it('should handle edge case with zero original allocations', () => {
      const originalAllocations: Array<{category: string, value: number, percentage: number}> = [];
      const newAllocations = [
        { category: 'Aktien', value: 100000, percentage: 100 }
      ];

      const impact = PortfolioMathematics.calculatePortfolioImpact(
        originalAllocations,
        newAllocations,
        0,
        100000
      );

      expect(impact.totalValueChange).toBe(100000);
      expect(impact.totalValueChangePercentage).toBe(0); // Avoid division by zero
    });
  });

  describe('Performance Tests', () => {
    it('should handle large portfolios efficiently', () => {
      const largePortfolio = Array.from({ length: 100 }, (_, i) => ({
        category: `Category_${i}`,
        value: 1000,
        percentage: 1
      }));

      const modifiedPortfolio = largePortfolio.map(item => ({
        ...item,
        value: item.value * 1.1,
        percentage: item.percentage * 1.1
      }));

      const startTime = Date.now();
      const impact = PortfolioMathematics.calculatePortfolioImpact(
        largePortfolio,
        modifiedPortfolio,
        100000,
        110000
      );
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(impact).toBeDefined();
    });
  });
});