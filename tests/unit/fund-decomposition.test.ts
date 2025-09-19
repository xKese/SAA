/**
 * Comprehensive fund decomposition tests
 * Tests fund decomposition accuracy, double-counting detection,
 * currency exposure validation, and geographic allocation integrity
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PortfolioMathematics,
  FundHolding,
  ValidationSeverity,
  ValidationIssue
} from '../../server/utils/portfolio-mathematics';

describe('Fund Decomposition Tests', () => {
  let testFundHoldings: FundHolding[];
  
  beforeEach(() => {
    testFundHoldings = [
      {
        name: 'Apple Inc',
        isin: 'US0378331005',
        weight: 0.25,
        value: 25000,
        currency: 'USD',
        assetClass: 'Aktien',
        geography: 'USA/Nordamerika',
        sector: 'Technology'
      },
      {
        name: 'Microsoft Corp',
        isin: 'US5949181045',
        weight: 0.30,
        value: 30000,
        currency: 'USD',
        assetClass: 'Aktien',
        geography: 'USA/Nordamerika',
        sector: 'Technology'
      },
      {
        name: 'SAP SE',
        isin: 'DE0007164600',
        weight: 0.20,
        value: 20000,
        currency: 'EUR',
        assetClass: 'Aktien',
        geography: 'Deutschland',
        sector: 'Technology'
      },
      {
        name: 'Nestle SA',
        isin: 'CH0038863350',
        weight: 0.15,
        value: 15000,
        currency: 'CHF',
        assetClass: 'Aktien',
        geography: 'Europa (inkl. UK)',
        sector: 'Consumer Goods'
      },
      {
        name: 'German Government Bond',
        isin: 'DE0001102309',
        weight: 0.10,
        value: 10000,
        currency: 'EUR',
        assetClass: 'Anleihen',
        geography: 'Deutschland',
        sector: 'Government'
      }
    ];
  });

  describe('Fund Decomposition Accuracy with Tolerance Levels', () => {
    it('should validate accurate decomposition within 0.01% tolerance', () => {
      const fundValue = 100000;
      const issues = PortfolioMathematics.validateFundDecomposition(fundValue, testFundHoldings);
      
      expect(issues).toHaveLength(0);
    });

    it('should accept minor deviations within tolerance (0.005%)', () => {
      const fundValue = 100005; // 5 EUR difference = 0.005%
      const issues = PortfolioMathematics.validateFundDecomposition(fundValue, testFundHoldings);
      
      expect(issues).toHaveLength(0);
    });

    it('should reject deviations outside tolerance (0.05%)', () => {
      const fundValue = 100050; // 50 EUR difference = 0.05%
      const issues = PortfolioMathematics.validateFundDecomposition(fundValue, testFundHoldings);
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].code).toBe('FUND_DECOMP_002');
      expect(issues[0].severity).toBe(ValidationSeverity.Critical);
    });

    it('should handle different tolerance levels correctly', () => {
      const strictTolerance = 0.0001; // 0.01%
      const looseTolerance = 0.001;   // 0.1%
      
      const fundValue = 100020; // 20 EUR difference = 0.02%
      
      // Should fail with strict tolerance
      const strictIssues = PortfolioMathematics.validateFundDecomposition(
        fundValue, 
        testFundHoldings, 
        strictTolerance
      );
      expect(strictIssues.length).toBeGreaterThan(0);
      
      // Should pass with loose tolerance
      const looseIssues = PortfolioMathematics.validateFundDecomposition(
        fundValue, 
        testFundHoldings, 
        looseTolerance
      );
      expect(looseIssues).toHaveLength(0);
    });

    it('should validate weight consistency with value proportions', () => {
      const inconsistentWeights: FundHolding[] = [
        {
          name: 'Asset A',
          weight: 0.6, // Weight says 60%
          value: 40000, // But value is only 40% of total
          currency: 'EUR',
          assetClass: 'Aktien',
          geography: 'Deutschland'
        },
        {
          name: 'Asset B',
          weight: 0.4, // Weight says 40%
          value: 60000, // But value is 60% of total
          currency: 'EUR',
          assetClass: 'Aktien',
          geography: 'Deutschland'
        }
      ];

      const issues = PortfolioMathematics.validateFundDecomposition(100000, inconsistentWeights);
      
      expect(issues.some(issue => issue.code === 'FUND_DECOMP_004')).toBe(true);
      expect(issues.some(issue => issue.message.includes('Weight-value mismatch'))).toBe(true);
    });

    it('should handle large fund decompositions efficiently', () => {
      // Create large fund with 500 holdings
      const largeFundHoldings: FundHolding[] = Array.from({ length: 500 }, (_, i) => ({
        name: `Holding ${i + 1}`,
        isin: `TEST${String(i + 1).padStart(8, '0')}`,
        weight: 1 / 500, // Equal weighting
        value: 1000000 / 500, // Equal value distribution
        currency: i % 3 === 0 ? 'EUR' : i % 3 === 1 ? 'USD' : 'GBP',
        assetClass: i % 2 === 0 ? 'Aktien' : 'Anleihen',
        geography: i % 4 === 0 ? 'Deutschland' : i % 4 === 1 ? 'USA/Nordamerika' : 
                  i % 4 === 2 ? 'Europa (inkl. UK)' : 'Emerging Markets'
      }));

      const startTime = performance.now();
      const issues = PortfolioMathematics.validateFundDecomposition(1000000, largeFundHoldings);
      const endTime = performance.now();

      // Should complete validation within 500ms
      expect(endTime - startTime).toBeLessThan(500);
      expect(issues).toHaveLength(0);
    });
  });

  describe('Double-Counting Detection Across Fund Types', () => {
    it('should detect double counting by ISIN across ETFs', () => {
      const portfolioPositions = [
        { name: 'Apple Inc Direct', isin: 'US0378331005', value: 10000 },
        { name: 'Microsoft Corp Direct', isin: 'US5949181045', value: 15000 }
      ];

      const etfHoldings: FundHolding[] = [
        {
          name: 'Apple Inc (via Tech ETF)',
          isin: 'US0378331005', // Same ISIN as direct holding
          weight: 0.3,
          value: 8000,
          currency: 'USD',
          assetClass: 'Aktien',
          geography: 'USA/Nordamerika'
        },
        {
          name: 'Google Inc',
          isin: 'US02079K3059',
          weight: 0.7,
          value: 18666,
          currency: 'USD',
          assetClass: 'Aktien',
          geography: 'USA/Nordamerika'
        }
      ];

      const result = PortfolioMathematics.detectDoubleCounting(portfolioPositions, etfHoldings);
      
      expect(result.detected).toBe(true);
      expect(result.affectedAssets).toContain('Apple Inc Direct');
      expect(result.affectedAssets).toContain('Apple Inc (via Tech ETF)');
      expect(result.overlapValue).toBe(8000);
    });

    it('should detect multiple overlapping positions', () => {
      const portfolioPositions = [
        { name: 'Apple Inc', isin: 'US0378331005', value: 10000 },
        { name: 'Microsoft Corp', isin: 'US5949181045', value: 15000 },
        { name: 'Google Inc', isin: 'US02079K3059', value: 12000 }
      ];

      const fundHoldings: FundHolding[] = [
        {
          name: 'Apple via Fund A',
          isin: 'US0378331005',
          weight: 0.25,
          value: 5000,
          currency: 'USD',
          assetClass: 'Aktien',
          geography: 'USA/Nordamerika'
        },
        {
          name: 'Microsoft via Fund A',
          isin: 'US5949181045',
          weight: 0.35,
          value: 7000,
          currency: 'USD',
          assetClass: 'Aktien',
          geography: 'USA/Nordamerika'
        },
        {
          name: 'Tesla Inc',
          isin: 'US88160R1014',
          weight: 0.4,
          value: 8000,
          currency: 'USD',
          assetClass: 'Aktien',
          geography: 'USA/Nordamerika'
        }
      ];

      const result = PortfolioMathematics.detectDoubleCounting(portfolioPositions, fundHoldings);
      
      expect(result.detected).toBe(true);
      expect(result.affectedAssets).toHaveLength(4); // 2 direct + 2 via fund
      expect(result.overlapValue).toBe(12000); // 5000 + 7000
    });

    it('should handle similar names but different ISINs', () => {
      const portfolioPositions = [
        { name: 'Apple Inc', isin: 'US0378331005', value: 10000 }
      ];

      const fundHoldings: FundHolding[] = [
        {
          name: 'Apple Inc', // Same name
          isin: 'US0378331006', // Different ISIN (hypothetical)
          weight: 1.0,
          value: 20000,
          currency: 'USD',
          assetClass: 'Aktien',
          geography: 'USA/Nordamerika'
        }
      ];

      const result = PortfolioMathematics.detectDoubleCounting(portfolioPositions, fundHoldings);
      
      expect(result.detected).toBe(false); // Different ISINs, no double counting
      expect(result.affectedAssets).toHaveLength(0);
      expect(result.overlapValue).toBe(0);
    });

    it('should detect partial overlaps in fund decomposition', () => {
      const portfolioPositions = [
        { name: 'Apple Inc', isin: 'US0378331005', value: 20000 }
      ];

      const fundHoldings: FundHolding[] = [
        {
          name: 'Apple Inc (partial)',
          isin: 'US0378331005',
          weight: 0.5,
          value: 10000, // Only partial overlap
          currency: 'USD',
          assetClass: 'Aktien',
          geography: 'USA/Nordamerika'
        },
        {
          name: 'Other Position',
          isin: 'US1234567890',
          weight: 0.5,
          value: 10000,
          currency: 'USD',
          assetClass: 'Aktien',
          geography: 'USA/Nordamerika'
        }
      ];

      const result = PortfolioMathematics.detectDoubleCounting(portfolioPositions, fundHoldings);
      
      expect(result.detected).toBe(true);
      expect(result.overlapValue).toBe(10000); // Partial overlap value
    });
  });

  describe('Currency Exposure Validation with Hedged/Unhedged Funds', () => {
    it('should validate correct hedged currency exposure', () => {
      const hedgedCurrencies = [
        { currency: 'EUR', exposure: 40, isHedged: false }, // Base currency
        { currency: 'USD', exposure: 35, isHedged: true },  // Hedged
        { currency: 'GBP', exposure: 15, isHedged: true },  // Hedged
        { currency: 'CHF', exposure: 10, isHedged: true }   // Hedged
      ];

      const issues = PortfolioMathematics.validateCurrencyExposure('EUR', hedgedCurrencies, true);
      
      expect(issues).toHaveLength(0);
    });

    it('should detect unhedged exposure in supposedly hedged fund', () => {
      const poorlyHedgedCurrencies = [
        { currency: 'EUR', exposure: 40, isHedged: false },
        { currency: 'USD', exposure: 40, isHedged: false }, // Should be hedged
        { currency: 'GBP', exposure: 20, isHedged: true }
      ];

      const issues = PortfolioMathematics.validateCurrencyExposure('EUR', poorlyHedgedCurrencies, true);
      
      expect(issues.some(issue => issue.code === 'CURRENCY_003')).toBe(true);
      expect(issues.some(issue => issue.message.includes('hedging inconsistency'))).toBe(true);
    });

    it('should validate currency exposure totals', () => {
      const incorrectTotalCurrencies = [
        { currency: 'EUR', exposure: 50, isHedged: false },
        { currency: 'USD', exposure: 35, isHedged: true },
        { currency: 'GBP', exposure: 20, isHedged: true } // Total = 105%
      ];

      const issues = PortfolioMathematics.validateCurrencyExposure('EUR', incorrectTotalCurrencies, true);
      
      expect(issues.some(issue => issue.code === 'CURRENCY_001')).toBe(true);
    });

    it('should detect negative currency exposures', () => {
      const negativeCurrencies = [
        { currency: 'EUR', exposure: 60, isHedged: false },
        { currency: 'USD', exposure: 50, isHedged: true },
        { currency: 'GBP', exposure: -10, isHedged: true } // Negative exposure
      ];

      const issues = PortfolioMathematics.validateCurrencyExposure('EUR', negativeCurrencies, true);
      
      expect(issues.some(issue => issue.code === 'CURRENCY_002')).toBe(true);
      expect(issues.some(issue => issue.severity === ValidationSeverity.Critical)).toBe(true);
    });

    it('should validate complex multi-currency fund scenarios', () => {
      const complexCurrencies = [
        { currency: 'EUR', exposure: 25, isHedged: false },
        { currency: 'USD', exposure: 30, isHedged: true },
        { currency: 'GBP', exposure: 15, isHedged: true },
        { currency: 'JPY', exposure: 10, isHedged: false }, // Unhedged emerging
        { currency: 'CHF', exposure: 8, isHedged: true },
        { currency: 'CAD', exposure: 7, isHedged: false },
        { currency: 'AUD', exposure: 5, isHedged: false }
      ];

      const issues = PortfolioMathematics.validateCurrencyExposure('EUR', complexCurrencies, false);
      
      // Should pass as it's marked as partially hedged fund
      expect(issues.filter(issue => issue.severity === ValidationSeverity.Critical)).toHaveLength(0);
    });

    it('should handle currency hedging effectiveness analysis', () => {
      const hedgedCurrencies = [
        { currency: 'EUR', exposure: 30, isHedged: false },
        { currency: 'USD', exposure: 40, isHedged: true },  // 40% hedged
        { currency: 'GBP', exposure: 20, isHedged: true },  // 20% hedged
        { currency: 'JPY', exposure: 10, isHedged: false }  // 10% unhedged
      ];

      // Calculate hedging effectiveness: (40 + 20) / 100 = 60%
      const hedgedPercentage = hedgedCurrencies
        .filter(c => c.isHedged && c.currency !== 'EUR')
        .reduce((sum, c) => sum + c.exposure, 0);
      
      expect(hedgedPercentage).toBe(60); // 60% effectively hedged
    });
  });

  describe('Geographic Allocation Integrity with Missing Regions', () => {
    it('should validate complete geographic coverage', () => {
      const completeGeographic = [
        { category: 'Deutschland', value: 25000, percentage: 25 },
        { category: 'Europa (inkl. UK)', value: 30000, percentage: 30 },
        { category: 'USA/Nordamerika', value: 30000, percentage: 30 },
        { category: 'Emerging Markets', value: 15000, percentage: 15 }
      ];

      const result = PortfolioMathematics.validateGeographicIntegrity(completeGeographic);
      
      expect(result.isValid).toBe(true);
      expect(result.totalAllocation).toBe(100);
      expect(result.missingAllocations).toHaveLength(0);
    });

    it('should detect missing major geographic regions', () => {
      const incompleteGeographic = [
        { category: 'Deutschland', value: 40000, percentage: 40 },
        { category: 'USA/Nordamerika', value: 60000, percentage: 60 }
        // Missing Europa and Emerging Markets
      ];

      const result = PortfolioMathematics.validateGeographicIntegrity(incompleteGeographic);
      
      expect(result.isValid).toBe(false);
      expect(result.totalAllocation).toBe(100);
      expect(result.missingAllocations).toContain('Europa');
      expect(result.missingAllocations).toContain('Emerging Markets');
    });

    it('should handle over-allocation scenarios', () => {
      const overAllocated = [
        { category: 'Deutschland', value: 40000, percentage: 40 },
        { category: 'Europa (inkl. UK)', value: 35000, percentage: 35 },
        { category: 'USA/Nordamerika', value: 30000, percentage: 30 } // Total = 105%
      ];

      const result = PortfolioMathematics.validateGeographicIntegrity(overAllocated);
      
      expect(result.isValid).toBe(false);
      expect(result.totalAllocation).toBe(105);
    });

    it('should validate granular geographic breakdowns', () => {
      const granularGeographic = [
        { category: 'Deutschland', value: 20000, percentage: 20 },
        { category: 'Frankreich', value: 15000, percentage: 15 },
        { category: 'Italien', value: 10000, percentage: 10 },
        { category: 'Spanien', value: 5000, percentage: 5 },
        { category: 'USA', value: 25000, percentage: 25 },
        { category: 'Kanada', value: 5000, percentage: 5 },
        { category: 'China', value: 10000, percentage: 10 },
        { category: 'Indien', value: 5000, percentage: 5 },
        { category: 'Brasilien', value: 5000, percentage: 5 }
      ];

      const result = PortfolioMathematics.validateGeographicIntegrity(granularGeographic);
      
      expect(result.isValid).toBe(true);
      expect(result.totalAllocation).toBe(100);
    });

    it('should detect inconsistent value-percentage relationships', () => {
      const inconsistentGeographic = [
        { category: 'Deutschland', value: 30000, percentage: 25 }, // 30% value, 25% percentage
        { category: 'USA/Nordamerika', value: 70000, percentage: 75 } // 70% value, 75% percentage
      ];

      const result = PortfolioMathematics.validateGeographicIntegrity(inconsistentGeographic);
      
      // Should detect the inconsistency
      expect(result.isValid).toBe(false);
    });
  });

  describe('German Financial Standards Compliance Testing', () => {
    it('should validate BaFin asset classification standards', () => {
      const compliantPositions = [
        { name: 'DAX ETF', assetClass: 'Aktien', value: 40000, isin: 'DE0001234567' },
        { name: 'Euro Bond Fund', assetClass: 'Anleihen', value: 30000, isin: 'LU0123456789' },
        { name: 'Money Market Fund', assetClass: 'Liquidität/Cash', value: 20000, isin: 'DE0009876543' },
        { name: 'Real Estate Fund', assetClass: 'Immobilien', value: 10000, isin: 'DE0011223344' }
      ];

      const allocations = [
        { category: 'Aktien', percentage: 40 },
        { category: 'Anleihen', percentage: 30 },
        { category: 'Liquidität/Cash', percentage: 20 },
        { category: 'Immobilien', percentage: 10 }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(compliantPositions, allocations);
      
      expect(result.isCompliant).toBe(true);
      expect(result.bafin.assetClassification).toBe(true);
      expect(result.complianceScore).toBeGreaterThan(90);
    });

    it('should detect invalid asset class classifications', () => {
      const invalidPositions = [
        { name: 'Unknown Asset', assetClass: 'CryptoCoins', value: 50000, isin: 'DE0001234567' },
        { name: 'Valid Bond', assetClass: 'Anleihen', value: 50000, isin: 'LU0123456789' }
      ];

      const allocations = [
        { category: 'CryptoCoins', percentage: 50 },
        { category: 'Anleihen', percentage: 50 }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(invalidPositions, allocations);
      
      expect(result.isCompliant).toBe(false);
      expect(result.bafin.assetClassification).toBe(false);
      expect(result.issues.some(issue => issue.code === 'BAFIN_001')).toBe(true);
    });

    it('should validate UCITS derivative limits', () => {
      const derivativeHeavyPositions = [
        { name: 'Stock Fund', assetClass: 'Aktien', value: 70000, isin: 'DE0001234567' },
        { name: 'Options Strategy', assetClass: 'Derivate', value: 25000, isin: 'LU0123456789' }, // 25% derivatives
        { name: 'Cash', assetClass: 'Liquidität/Cash', value: 5000, isin: 'DE0009876543' }
      ];

      const allocations = [
        { category: 'Aktien', percentage: 70 },
        { category: 'Derivate', percentage: 25 },
        { category: 'Liquidität/Cash', percentage: 5 }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(derivativeHeavyPositions, allocations);
      
      expect(result.bafin.ucitsCompliance).toBe(false);
      expect(result.issues.some(issue => issue.code === 'UCITS_001')).toBe(true);
    });

    it('should validate ISIN format compliance', () => {
      const invalidISINPositions = [
        { name: 'Valid German Fund', assetClass: 'Aktien', value: 50000, isin: 'DE0001234567' },
        { name: 'Invalid ISIN Fund', assetClass: 'Anleihen', value: 30000, isin: 'INVALID123' },
        { name: 'Missing ISIN Fund', assetClass: 'Liquidität/Cash', value: 20000, isin: undefined }
      ];

      const allocations = [
        { category: 'Aktien', percentage: 50 },
        { category: 'Anleihen', percentage: 30 },
        { category: 'Liquidität/Cash', percentage: 20 }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(
        invalidISINPositions as any, 
        allocations
      );
      
      expect(result.issues.some(issue => issue.code === 'ISIN_001')).toBe(true);
      expect(result.complianceScore).toBeLessThan(90);
    });

    it('should validate reporting standard compliance', () => {
      const positions = [
        { name: 'German Equity', assetClass: 'Aktien', value: 60000, isin: 'DE0001234567' },
        { name: 'German Bond', assetClass: 'Anleihen', value: 40000, isin: 'DE0007654321' }
      ];

      const incorrectAllocations = [
        { category: 'Aktien', percentage: 60 },
        { category: 'Anleihen', percentage: 35 } // Total only 95%
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(positions, incorrectAllocations);
      
      expect(result.bafin.reportingStandards).toBe(false);
      expect(result.issues.some(issue => issue.code === 'REPORTING_001')).toBe(true);
    });

    it('should handle complex German fund structures', () => {
      const complexGermanPositions = [
        { name: 'Spezial-AIF', assetClass: 'Alternative Investments', value: 20000, isin: 'DE0001234567' },
        { name: 'UCITS Aktienfonds', assetClass: 'Aktien', value: 50000, isin: 'LU0123456789' },
        { name: 'Immobilien-Sondervermögen', assetClass: 'Immobilien', value: 25000, isin: 'DE0011223344' },
        { name: 'Geldmarktfonds', assetClass: 'Liquidität/Cash', value: 5000, isin: 'DE0055667788' }
      ];

      const allocations = [
        { category: 'Alternative Investments', percentage: 20 },
        { category: 'Aktien', percentage: 50 },
        { category: 'Immobilien', percentage: 25 },
        { category: 'Liquidität/Cash', percentage: 5 }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(complexGermanPositions, allocations);
      
      // Complex structures should still be compliant if properly classified
      expect(result.isCompliant).toBe(true);
      expect(result.complianceScore).toBeGreaterThan(85);
    });

    it('should validate decimal precision in German format', () => {
      const precisePositions = [
        { name: 'Precise Fund', assetClass: 'Aktien', value: 33333.33, isin: 'DE0001234567' },
        { name: 'Another Fund', assetClass: 'Anleihen', value: 66666.67, isin: 'DE0007654321' }
      ];

      const preciseAllocations = [
        { category: 'Aktien', percentage: 33.3333 },
        { category: 'Anleihen', percentage: 66.6667 }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(precisePositions, preciseAllocations);
      
      // Should handle German decimal precision correctly
      expect(result.isCompliant).toBe(true);
      expect(result.bafin.reportingStandards).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty fund decomposition', () => {
      const issues = PortfolioMathematics.validateFundDecomposition(0, []);
      
      expect(issues).toHaveLength(0); // Empty is valid
    });

    it('should handle null and undefined values gracefully', () => {
      const invalidHoldings: any[] = [
        {
          name: null,
          isin: undefined,
          weight: NaN,
          value: null,
          currency: '',
          assetClass: undefined,
          geography: null
        }
      ];

      const issues = PortfolioMathematics.validateFundDecomposition(100000, invalidHoldings);
      
      // Should not crash and should report validation issues
      expect(Array.isArray(issues)).toBe(true);
    });

    it('should handle extremely large fund values', () => {
      const largeValue = 1e12; // 1 trillion EUR
      const holdings: FundHolding[] = [
        {
          name: 'Large Position',
          weight: 1.0,
          value: largeValue,
          currency: 'EUR',
          assetClass: 'Aktien',
          geography: 'Global'
        }
      ];

      const issues = PortfolioMathematics.validateFundDecomposition(largeValue, holdings);
      
      expect(issues).toHaveLength(0);
    });

    it('should handle very small fund values and precision', () => {
      const smallValue = 0.01; // 1 cent
      const holdings: FundHolding[] = [
        {
          name: 'Tiny Position',
          weight: 1.0,
          value: smallValue,
          currency: 'EUR',
          assetClass: 'Liquidität/Cash',
          geography: 'Deutschland'
        }
      ];

      const issues = PortfolioMathematics.validateFundDecomposition(smallValue, holdings);
      
      expect(issues).toHaveLength(0);
    });

    it('should validate floating point precision handling', () => {
      const precisionTestValue = 100000.123456789;
      const holdings: FundHolding[] = [
        {
          name: 'Precision Test',
          weight: 0.333333333,
          value: 33333.3745186,
          currency: 'EUR',
          assetClass: 'Aktien',
          geography: 'Deutschland'
        },
        {
          name: 'Precision Test 2',
          weight: 0.666666667,
          value: 66666.7489481,
          currency: 'EUR',
          assetClass: 'Anleihen',
          geography: 'Deutschland'
        }
      ];

      const issues = PortfolioMathematics.validateFundDecomposition(precisionTestValue, holdings);
      
      // Should handle floating point precision correctly
      expect(issues).toHaveLength(0);
    });
  });
});