/**
 * Unit tests for enhanced portfolio mathematics validation
 * Tests the new look-through analysis validation framework
 */

import { describe, it, expect } from 'vitest';
import { 
  PortfolioMathematics, 
  ValidationSeverity, 
  FundHolding,
  LookThroughValidationResult,
  GermanFinancialComplianceResult
} from '../../server/utils/portfolio-mathematics';

describe('Enhanced Portfolio Mathematics Validation', () => {
  
  describe('validateLookThroughAnalysis', () => {
    const originalAllocations = [
      { category: 'Aktien', value: 60000, percentage: 60 },
      { category: 'Anleihen', value: 40000, percentage: 40 }
    ];

    const accurateLookThroughAllocations = [
      { category: 'Aktien Deutschland', value: 30000, percentage: 30 },
      { category: 'Aktien USA', value: 30000, percentage: 30 },
      { category: 'Anleihen Europa', value: 40000, percentage: 40 }
    ];

    it('should validate accurate fund decomposition', () => {
      const result = PortfolioMathematics.validateLookThroughAnalysis(
        originalAllocations,
        accurateLookThroughAllocations
      );

      expect(result.isValid).toBe(true);
      expect(result.overallScore).toBeGreaterThan(95);
      expect(result.totalValueDifference).toBe(0);
      expect(result.decompositionAccuracy).toBe(100);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect fund decomposition inaccuracy', () => {
      const inaccurateAllocations = [
        { category: 'Aktien Deutschland', value: 30000, percentage: 30 },
        { category: 'Aktien USA', value: 25000, percentage: 25 }, // 5000 EUR missing
        { category: 'Anleihen Europa', value: 40000, percentage: 40 }
      ];

      const result = PortfolioMathematics.validateLookThroughAnalysis(
        originalAllocations,
        inaccurateAllocations
      );

      expect(result.isValid).toBe(false);
      expect(result.overallScore).toBeLessThan(90);
      expect(result.totalValueDifference).toBe(5000);
      expect(result.decompositionAccuracy).toBeLessThan(100);
      expect(result.issues.some(i => i.code === 'FUND_DECOMP_001')).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate percentage consistency', () => {
      const inconsistentPercentages = [
        { category: 'Aktien Deutschland', value: 30000, percentage: 25 }, // Incorrect percentage
        { category: 'Aktien USA', value: 30000, percentage: 35 }, // Incorrect percentage  
        { category: 'Anleihen Europa', value: 40000, percentage: 40 }
      ];

      const result = PortfolioMathematics.validateLookThroughAnalysis(
        originalAllocations,
        inconsistentPercentages
      );

      expect(result.issues.some(i => i.code === 'CONSISTENCY_001')).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateFundDecomposition', () => {
    const testFundHoldings: FundHolding[] = [
      {
        name: 'German Stock A',
        weight: 0.4,
        value: 40000,
        currency: 'EUR',
        assetClass: 'Aktien',
        geography: 'Deutschland'
      },
      {
        name: 'US Stock B', 
        weight: 0.6,
        value: 60000,
        currency: 'USD',
        assetClass: 'Aktien',
        geography: 'USA/Nordamerika'
      }
    ];

    it('should validate accurate fund decomposition', () => {
      const fundValue = 100000;
      const issues = PortfolioMathematics.validateFundDecomposition(fundValue, testFundHoldings);
      
      expect(issues).toHaveLength(0);
    });

    it('should detect fund decomposition mismatch', () => {
      const fundValue = 105000; // 5000 EUR mismatch
      const issues = PortfolioMathematics.validateFundDecomposition(fundValue, testFundHoldings);
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].code).toBe('FUND_DECOMP_002');
      expect(issues[0].severity).toBe(ValidationSeverity.Critical);
    });

    it('should detect negative holdings', () => {
      const invalidHoldings: FundHolding[] = [
        ...testFundHoldings,
        {
          name: 'Negative Position',
          weight: -0.1,
          value: -5000,
          currency: 'EUR',
          assetClass: 'Aktien',
          geography: 'Deutschland'
        }
      ];

      const issues = PortfolioMathematics.validateFundDecomposition(100000, invalidHoldings);
      
      expect(issues.some(i => i.code === 'FUND_DECOMP_003')).toBe(true);
    });

    it('should detect weight inconsistencies', () => {
      const incorrectWeights: FundHolding[] = [
        {
          name: 'Stock A',
          weight: 0.3, // Weights sum to 0.8, not 1.0
          value: 50000,
          currency: 'EUR',
          assetClass: 'Aktien',
          geography: 'Deutschland'
        },
        {
          name: 'Stock B',
          weight: 0.5,
          value: 50000,
          currency: 'EUR',
          assetClass: 'Aktien',
          geography: 'USA/Nordamerika'
        }
      ];

      const issues = PortfolioMathematics.validateFundDecomposition(100000, incorrectWeights);
      
      expect(issues.some(i => i.code === 'FUND_DECOMP_004')).toBe(true);
    });
  });

  describe('detectDoubleCounting', () => {
    const portfolioPositions = [
      { name: 'Apple Inc', isin: 'US0378331005', value: 10000 },
      { name: 'Microsoft Corp', isin: 'US5949181045', value: 15000 }
    ];

    const underlyingHoldings: FundHolding[] = [
      {
        name: 'Apple Inc (via ETF)',
        isin: 'US0378331005', // Same ISIN - double counting!
        weight: 0.2,
        value: 5000,
        currency: 'USD',
        assetClass: 'Aktien',
        geography: 'USA/Nordamerika'
      },
      {
        name: 'Amazon.com Inc',
        isin: 'US0231351067',
        weight: 0.8,
        value: 20000,
        currency: 'USD',
        assetClass: 'Aktien',
        geography: 'USA/Nordamerika'
      }
    ];

    it('should detect double counting by ISIN', () => {
      const result = PortfolioMathematics.detectDoubleCounting(portfolioPositions, underlyingHoldings);
      
      expect(result.detected).toBe(true);
      expect(result.affectedAssets).toContain('Apple Inc');
      expect(result.affectedAssets).toContain('Apple Inc (via ETF)');
      expect(result.overlapValue).toBe(5000);
    });

    it('should not detect false positives', () => {
      const uniqueHoldings: FundHolding[] = [
        {
          name: 'Amazon.com Inc',
          isin: 'US0231351067',
          weight: 1.0,
          value: 25000,
          currency: 'USD',
          assetClass: 'Aktien',
          geography: 'USA/Nordamerika'
        }
      ];

      const result = PortfolioMathematics.detectDoubleCounting(portfolioPositions, uniqueHoldings);
      
      expect(result.detected).toBe(false);
      expect(result.affectedAssets).toHaveLength(0);
      expect(result.overlapValue).toBe(0);
    });
  });

  describe('validateCurrencyExposure', () => {
    const testCurrencies = [
      { currency: 'EUR', exposure: 40, isHedged: false },
      { currency: 'USD', exposure: 35, isHedged: true },
      { currency: 'GBP', exposure: 25, isHedged: true }
    ];

    it('should validate correct currency exposure', () => {
      const issues = PortfolioMathematics.validateCurrencyExposure('EUR', testCurrencies, false); // Change to false since only 60% is hedged
      
      expect(issues).toHaveLength(0);
    });

    it('should detect incorrect currency exposure sum', () => {
      const incorrectCurrencies = [
        { currency: 'EUR', exposure: 40, isHedged: false },
        { currency: 'USD', exposure: 35, isHedged: true },
        { currency: 'GBP', exposure: 30, isHedged: true } // Total = 105%
      ];

      const issues = PortfolioMathematics.validateCurrencyExposure('EUR', incorrectCurrencies, true);
      
      expect(issues.some(i => i.code === 'CURRENCY_001')).toBe(true);
    });

    it('should detect negative currency exposures', () => {
      const negativeCurrencies = [
        { currency: 'EUR', exposure: 40, isHedged: false },
        { currency: 'USD', exposure: 70, isHedged: true },
        { currency: 'GBP', exposure: -10, isHedged: true } // Negative exposure
      ];

      const issues = PortfolioMathematics.validateCurrencyExposure('EUR', negativeCurrencies, true);
      
      expect(issues.some(i => i.code === 'CURRENCY_002')).toBe(true);
    });

    it('should detect hedging inconsistency', () => {
      const poorlyHedgedCurrencies = [
        { currency: 'EUR', exposure: 40, isHedged: false },
        { currency: 'USD', exposure: 50, isHedged: false }, // Should be hedged but isn't
        { currency: 'GBP', exposure: 10, isHedged: true }
      ];

      const issues = PortfolioMathematics.validateCurrencyExposure('EUR', poorlyHedgedCurrencies, true);
      
      expect(issues.some(i => i.code === 'CURRENCY_003')).toBe(true);
    });
  });

  describe('validateGeographicIntegrity', () => {
    it('should validate complete geographic allocation', () => {
      const completeAllocation = [
        { category: 'Deutschland', value: 30000, percentage: 30 },
        { category: 'Europa (inkl. UK)', value: 25000, percentage: 25 },
        { category: 'USA/Nordamerika', value: 30000, percentage: 30 },
        { category: 'Emerging Markets', value: 15000, percentage: 15 }
      ];

      const result = PortfolioMathematics.validateGeographicIntegrity(completeAllocation);
      
      expect(result.isValid).toBe(true);
      expect(result.totalAllocation).toBe(100);
      expect(result.missingAllocations).toHaveLength(0);
    });

    it('should detect incomplete geographic allocation', () => {
      const incompleteAllocation = [
        { category: 'Deutschland', value: 50000, percentage: 50 },
        { category: 'USA/Nordamerika', value: 30000, percentage: 30 }
        // Missing Europa and Emerging Markets
      ];

      const result = PortfolioMathematics.validateGeographicIntegrity(incompleteAllocation);
      
      expect(result.isValid).toBe(false);
      expect(result.totalAllocation).toBe(80);
      expect(result.missingAllocations).toContain('Europa');
      expect(result.missingAllocations).toContain('Emerging Markets');
    });
  });

  describe('validateGermanFinancialStandards', () => {
    const compliantPositions = [
      { name: 'German Stock Fund', assetClass: 'Aktien', value: 60000, isin: 'DE0001234567' },
      { name: 'Euro Bond Fund', assetClass: 'Anleihen', value: 40000, isin: 'LU0123456789' }
    ];

    const compliantAllocations = [
      { category: 'Aktien', percentage: 60 },
      { category: 'Anleihen', percentage: 40 }
    ];

    it('should validate BaFin compliant portfolio', () => {
      const result = PortfolioMathematics.validateGermanFinancialStandards(
        compliantPositions, 
        compliantAllocations
      );
      
      expect(result.isCompliant).toBe(true);
      expect(result.bafin.assetClassification).toBe(true);
      expect(result.bafin.reportingStandards).toBe(true);
      expect(result.complianceScore).toBeGreaterThan(90);
    });

    it('should detect invalid asset classifications', () => {
      const invalidPositions = [
        { name: 'Unknown Asset', assetClass: 'InvalidClass', value: 50000, isin: 'DE0001234567' },
        { name: 'Valid Bond', assetClass: 'Anleihen', value: 50000, isin: 'LU0123456789' }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(
        invalidPositions, 
        compliantAllocations
      );
      
      expect(result.bafin.assetClassification).toBe(false);
      expect(result.issues.some(i => i.code === 'BAFIN_001')).toBe(true);
      expect(result.complianceScore).toBeLessThan(90);
    });

    it('should detect UCITS derivative violations', () => {
      const derivativeHeavyPositions = [
        { name: 'Stock Fund', assetClass: 'Aktien', value: 80000, isin: 'DE0001234567' },
        { name: 'Derivatives', assetClass: 'Derivate', value: 20000, isin: 'LU0123456789' } // 20% derivatives
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(
        derivativeHeavyPositions, 
        compliantAllocations
      );
      
      expect(result.bafin.ucitsCompliance).toBe(false);
      expect(result.issues.some(i => i.code === 'UCITS_001')).toBe(true);
    });

    it('should detect missing ISIN codes', () => {
      const missingISINPositions = [
        { name: 'Stock Fund', assetClass: 'Aktien', value: 60000, isin: undefined },
        { name: 'Bond Fund', assetClass: 'Anleihen', value: 40000, isin: 'INVALID' }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(
        missingISINPositions as any, 
        compliantAllocations
      );
      
      expect(result.issues.some(i => i.code === 'ISIN_001')).toBe(true);
    });

    it('should detect reporting standard violations', () => {
      const incorrectAllocations = [
        { category: 'Aktien', percentage: 60 },
        { category: 'Anleihen', percentage: 35 } // Only sums to 95%
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(
        compliantPositions, 
        incorrectAllocations
      );
      
      expect(result.bafin.reportingStandards).toBe(false);
      expect(result.issues.some(i => i.code === 'REPORTING_001')).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty data gracefully', () => {
      const result = PortfolioMathematics.validateLookThroughAnalysis([], []);
      
      expect(result.isValid).toBe(true); // Empty is technically valid
      expect(result.totalValueDifference).toBe(0);
      expect(result.decompositionAccuracy).toBe(100);
    });

    it('should handle validation errors gracefully', () => {
      const invalidData = [
        { category: null, value: 'invalid', percentage: undefined }
      ];

      const result = PortfolioMathematics.validateLookThroughAnalysis(
        invalidData as any, 
        invalidData as any
      );
      
      // The validation system handles null values gracefully by filtering them out
      expect(result.isValid).toBe(true); // Empty after filtering is valid
      expect(result.overallScore).toBeGreaterThan(0);
    });
  });

  describe('Tolerance and Precision Tests', () => {
    it('should respect 0.01% fund decomposition tolerance', () => {
      const originalValue = 100000;
      const lookThroughWithinTolerance = [
        { category: 'Test', value: 100000.05, percentage: 100 } // 0.05 EUR difference = 0.0005%
      ];

      const result = PortfolioMathematics.validateLookThroughAnalysis(
        [{ category: 'Test', value: originalValue, percentage: 100 }],
        lookThroughWithinTolerance
      );
      
      expect(result.isValid).toBe(true);
      expect(result.decompositionAccuracy).toBeGreaterThan(99.99);
    });

    it('should reject values outside tolerance', () => {
      const originalValue = 100000;
      const lookThroughOutsideTolerance = [
        { category: 'Test', value: 100050, percentage: 100 } // 50 EUR difference = 0.05%
      ];

      const result = PortfolioMathematics.validateLookThroughAnalysis(
        [{ category: 'Test', value: originalValue, percentage: 100 }],
        lookThroughOutsideTolerance
      );
      
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.code === 'FUND_DECOMP_001')).toBe(true);
    });
  });
});