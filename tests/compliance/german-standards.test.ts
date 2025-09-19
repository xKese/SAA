/**
 * German financial standards compliance tests
 * Tests BaFin regulations, UCITS compliance, German formatting,
 * geographic allocation standards, and ISIN validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PortfolioMathematics,
  GermanFinancialComplianceResult,
  ValidationSeverity
} from '../../server/utils/portfolio-mathematics';

describe('German Standards Compliance Tests', () => {
  describe('BaFin Asset Classification Validation', () => {
    it('should validate compliant BaFin asset classifications', () => {
      const compliantPositions = [
        { name: 'DAX ETF', assetClass: 'Aktien', value: 300000, isin: 'DE0001234567' },
        { name: 'Bundesanleihe', assetClass: 'Anleihen', value: 200000, isin: 'DE0001102309' },
        { name: 'Geldmarktfonds', assetClass: 'Liquidität/Cash', value: 100000, isin: 'DE0009876543' },
        { name: 'Immobilienfonds', assetClass: 'Immobilien', value: 150000, isin: 'DE0011223344' },
        { name: 'Rohstofffonds', assetClass: 'Rohstoffe', value: 50000, isin: 'DE0055667788' }
      ];

      const allocations = [
        { category: 'Aktien', percentage: 37.5 },
        { category: 'Anleihen', percentage: 25.0 },
        { category: 'Liquidität/Cash', percentage: 12.5 },
        { category: 'Immobilien', percentage: 18.75 },
        { category: 'Rohstoffe', percentage: 6.25 }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(
        compliantPositions,
        allocations
      );

      expect(result.isCompliant).toBe(true);
      expect(result.bafin.assetClassification).toBe(true);
      expect(result.complianceScore).toBeGreaterThan(90);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect invalid BaFin asset classifications', () => {
      const invalidPositions = [
        { name: 'Bitcoin Fund', assetClass: 'Kryptowährungen', value: 100000, isin: 'DE0001234567' },
        { name: 'NFT Collection', assetClass: 'Digitale Assets', value: 50000, isin: 'DE0009876543' },
        { name: 'Valid Stock Fund', assetClass: 'Aktien', value: 150000, isin: 'DE0011223344' }
      ];

      const allocations = [
        { category: 'Kryptowährungen', percentage: 33.33 },
        { category: 'Digitale Assets', percentage: 16.67 },
        { category: 'Aktien', percentage: 50.0 }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(
        invalidPositions,
        allocations
      );

      expect(result.isCompliant).toBe(false);
      expect(result.bafin.assetClassification).toBe(false);
      expect(result.issues.some(issue => issue.code === 'BAFIN_001')).toBe(true);
      expect(result.issues.some(issue => issue.message.includes('Kryptowährungen'))).toBe(true);
      expect(result.complianceScore).toBeLessThan(70);
    });

    it('should validate BaFin concentration limits', () => {
      // Test excessive concentration in single asset class
      const concentratedPositions = [
        { name: 'German Stock A', assetClass: 'Aktien', value: 850000, isin: 'DE0001234567' },
        { name: 'German Stock B', assetClass: 'Aktien', value: 100000, isin: 'DE0009876543' },
        { name: 'Cash', assetClass: 'Liquidität/Cash', value: 50000, isin: 'DE0011223344' }
      ];

      const allocations = [
        { category: 'Aktien', percentage: 95.0 }, // Excessive equity concentration
        { category: 'Liquidität/Cash', percentage: 5.0 }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(
        concentratedPositions,
        allocations
      );

      expect(result.issues.some(issue => issue.code === 'BAFIN_002')).toBe(true);
      expect(result.issues.some(issue => issue.severity === ValidationSeverity.Warning)).toBe(true);
    });

    it('should validate German fund type classifications', () => {
      const germanFundTypes = [
        { name: 'Publikums-AIF', assetClass: 'Alternative Investments', value: 100000, isin: 'DE0001234567' },
        { name: 'Spezial-AIF', assetClass: 'Alternative Investments', value: 150000, isin: 'DE0009876543' },
        { name: 'UCITS-Fonds', assetClass: 'Aktien', value: 200000, isin: 'LU0123456789' },
        { name: 'Immobilien-Sondervermögen', assetClass: 'Immobilien', value: 100000, isin: 'DE0011223344' }
      ];

      const allocations = [
        { category: 'Alternative Investments', percentage: 45.45 },
        { category: 'Aktien', percentage: 36.36 },
        { category: 'Immobilien', percentage: 18.18 }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(
        germanFundTypes,
        allocations
      );

      expect(result.isCompliant).toBe(true);
      expect(result.bafin.assetClassification).toBe(true);
    });
  });

  describe('UCITS Compliance Requirements Testing', () => {
    it('should validate UCITS compliant portfolio structure', () => {
      const ucitsCompliantPositions = [
        { name: 'European Equity UCITS', assetClass: 'Aktien', value: 400000, isin: 'LU0123456789' },
        { name: 'Euro Bond UCITS', assetClass: 'Anleihen', value: 300000, isin: 'LU0987654321' },
        { name: 'Money Market UCITS', assetClass: 'Liquidität/Cash', value: 200000, isin: 'LU0555666777' },
        { name: 'Small Derivative Position', assetClass: 'Derivate', value: 50000, isin: 'LU0888999000' } // 5.56% derivatives
      ];

      const allocations = [
        { category: 'Aktien', percentage: 42.11 },
        { category: 'Anleihen', percentage: 31.58 },
        { category: 'Liquidität/Cash', percentage: 21.05 },
        { category: 'Derivate', percentage: 5.26 }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(
        ucitsCompliantPositions,
        allocations
      );

      expect(result.isCompliant).toBe(true);
      expect(result.bafin.ucitsCompliance).toBe(true);
      expect(result.complianceScore).toBeGreaterThan(90);
    });

    it('should detect UCITS derivative limit violations', () => {
      const excessiveDerivatives = [
        { name: 'Stock Fund', assetClass: 'Aktien', value: 600000, isin: 'LU0123456789' },
        { name: 'Options Strategy', assetClass: 'Derivate', value: 250000, isin: 'LU0987654321' }, // 29.4% derivatives
        { name: 'Futures Portfolio', assetClass: 'Derivate', value: 100000, isin: 'LU0555666777' }, // Additional 11.8%
        { name: 'Cash', assetClass: 'Liquidität/Cash', value: 50000, isin: 'LU0888999000' }
      ];

      const allocations = [
        { category: 'Aktien', percentage: 60.0 },
        { category: 'Derivate', percentage: 35.0 }, // Exceeds 10% UCITS limit
        { category: 'Liquidität/Cash', percentage: 5.0 }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(
        excessiveDerivatives,
        allocations
      );

      expect(result.bafin.ucitsCompliance).toBe(false);
      expect(result.issues.some(issue => issue.code === 'UCITS_001')).toBe(true);
      expect(result.issues.some(issue => issue.severity === ValidationSeverity.Critical)).toBe(true);
    });

    it('should validate UCITS diversification requirements', () => {
      // Test single issuer concentration limits (max 10% per issuer)
      const concentratedPositions = [
        { name: 'Apple Inc Position', assetClass: 'Aktien', value: 120000, isin: 'US0378331005' }, // 12% of portfolio
        { name: 'Microsoft Position', assetClass: 'Aktien', value: 80000, isin: 'US5949181045' },
        { name: 'Other Holdings', assetClass: 'Aktien', value: 300000, isin: 'DE0001234567' },
        { name: 'Bonds', assetClass: 'Anleihen', value: 500000, isin: 'DE0001102309' }
      ];

      const allocations = [
        { category: 'Aktien', percentage: 50.0 },
        { category: 'Anleihen', percentage: 50.0 }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(
        concentratedPositions,
        allocations
      );

      expect(result.issues.some(issue => issue.code === 'UCITS_002')).toBe(true);
      expect(result.issues.some(issue => issue.message.includes('concentration limit'))).toBe(true);
    });

    it('should validate UCITS eligible asset types', () => {
      const nonUCITSAssets = [
        { name: 'Real Estate Direct', assetClass: 'Immobilien', value: 300000, isin: 'DE0011223344' },
        { name: 'Private Equity', assetClass: 'Alternative Investments', value: 200000, isin: 'LU0123456789' },
        { name: 'Commodity Direct', assetClass: 'Rohstoffe', value: 100000, isin: 'DE0055667788' },
        { name: 'Valid UCITS Fund', assetClass: 'Aktien', value: 400000, isin: 'LU0987654321' }
      ];

      const allocations = [
        { category: 'Immobilien', percentage: 30.0 },
        { category: 'Alternative Investments', percentage: 20.0 },
        { category: 'Rohstoffe', percentage: 10.0 },
        { category: 'Aktien', percentage: 40.0 }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(
        nonUCITSAssets,
        allocations
      );

      expect(result.bafin.ucitsCompliance).toBe(false);
      expect(result.issues.some(issue => issue.code === 'UCITS_003')).toBe(true);
    });
  });

  describe('German Decimal Formatting and Currency Display', () => {
    it('should validate German decimal formatting standards', () => {
      const germanFormattedPositions = [
        { name: 'Test Fund 1', assetClass: 'Aktien', value: 1234567.89, isin: 'DE0001234567' },
        { name: 'Test Fund 2', assetClass: 'Anleihen', value: 987654.321, isin: 'DE0009876543' }
      ];

      const preciseAllocations = [
        { category: 'Aktien', percentage: 55.5555 },
        { category: 'Anleihen', percentage: 44.4445 }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(
        germanFormattedPositions,
        preciseAllocations
      );

      // Test German number formatting
      const formattedValue = new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR'
      }).format(1234567.89);

      expect(formattedValue).toBe('1.234.567,89 €');

      // Validate decimal precision handling
      expect(result.bafin.reportingStandards).toBe(true);
    });

    it('should handle German percentage formatting', () => {
      const percentages = [55.5555, 44.4445];
      
      percentages.forEach(percentage => {
        const formatted = new Intl.NumberFormat('de-DE', {
          style: 'percent',
          minimumFractionDigits: 2,
          maximumFractionDigits: 4
        }).format(percentage / 100);

        expect(formatted).toMatch(/\d{1,2},\d{2,4}\s%/); // German percentage format
      });
    });

    it('should validate German date formatting in reporting', () => {
      const testDate = new Date('2024-01-15T10:30:00Z');
      
      const germanDate = new Intl.DateTimeFormat('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(testDate);

      expect(germanDate).toBe('15.01.2024');

      const germanDateTime = new Intl.DateTimeFormat('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Berlin'
      }).format(testDate);

      expect(germanDateTime).toMatch(/\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}/);
    });

    it('should handle German address and contact formatting', () => {
      const germanAddress = {
        street: 'Musterstraße 123',
        postalCode: '12345',
        city: 'Berlin',
        country: 'Deutschland'
      };

      const formattedAddress = `${germanAddress.street}\n${germanAddress.postalCode} ${germanAddress.city}\n${germanAddress.country}`;
      
      expect(formattedAddress).toContain('Musterstraße 123');
      expect(formattedAddress).toContain('12345 Berlin');
      expect(formattedAddress).toContain('Deutschland');
    });
  });

  describe('Geographic Allocation Standards per German Requirements', () => {
    it('should validate German geographic classification standards', () => {
      const germanGeoAllocations = [
        { category: 'Deutschland', value: 250000, percentage: 25.0 },
        { category: 'Europa (inkl. UK)', value: 300000, percentage: 30.0 },
        { category: 'USA/Nordamerika', value: 250000, percentage: 25.0 },
        { category: 'Asien (ex Japan)', value: 100000, percentage: 10.0 },
        { category: 'Japan', value: 50000, percentage: 5.0 },
        { category: 'Emerging Markets', value: 50000, percentage: 5.0 }
      ];

      const result = PortfolioMathematics.validateGeographicIntegrity(germanGeoAllocations);

      expect(result.isValid).toBe(true);
      expect(result.totalAllocation).toBe(100);
      expect(result.missingAllocations).toHaveLength(0);
    });

    it('should detect missing mandatory German geographic categories', () => {
      const incompleteGeoAllocations = [
        { category: 'Deutschland', value: 400000, percentage: 40.0 },
        { category: 'USA/Nordamerika', value: 600000, percentage: 60.0 }
        // Missing Europa, which is mandatory for German reporting
      ];

      const result = PortfolioMathematics.validateGeographicIntegrity(incompleteGeoAllocations);

      expect(result.isValid).toBe(false);
      expect(result.missingAllocations).toContain('Europa');
    });

    it('should validate German sector classification standards', () => {
      const germanSectorData = [
        { sector: 'Technologie', value: 300000, percentage: 30.0 },
        { sector: 'Finanzen', value: 200000, percentage: 20.0 },
        { sector: 'Gesundheitswesen', value: 150000, percentage: 15.0 },
        { sector: 'Konsumgüter', value: 150000, percentage: 15.0 },
        { sector: 'Industrie', value: 100000, percentage: 10.0 },
        { sector: 'Energie', value: 50000, percentage: 5.0 },
        { sector: 'Sonstige', value: 50000, percentage: 5.0 }
      ];

      // German sector classifications should follow BaFin guidelines
      const validSectors = [
        'Technologie', 'Finanzen', 'Gesundheitswesen', 'Konsumgüter',
        'Industrie', 'Energie', 'Telekommunikation', 'Versorger',
        'Immobilien', 'Materialien', 'Sonstige'
      ];

      germanSectorData.forEach(sectorData => {
        expect(validSectors).toContain(sectorData.sector);
      });
    });

    it('should handle regional sub-classifications correctly', () => {
      const detailedGeoAllocations = [
        { category: 'Deutschland', value: 150000, percentage: 15.0 },
        { category: 'Frankreich', value: 120000, percentage: 12.0 },
        { category: 'Italien', value: 80000, percentage: 8.0 },
        { category: 'Spanien', value: 50000, percentage: 5.0 },
        { category: 'Großbritannien', value: 100000, percentage: 10.0 },
        { category: 'USA', value: 200000, percentage: 20.0 },
        { category: 'Kanada', value: 50000, percentage: 5.0 },
        { category: 'Japan', value: 100000, percentage: 10.0 },
        { category: 'China', value: 100000, percentage: 10.0 },
        { category: 'Sonstige', value: 50000, percentage: 5.0 }
      ];

      const result = PortfolioMathematics.validateGeographicIntegrity(detailedGeoAllocations);

      expect(result.isValid).toBe(true);
      expect(result.totalAllocation).toBe(100);
    });
  });

  describe('ISIN Validation and Format Checking', () => {
    it('should validate correct ISIN formats', () => {
      const validISINs = [
        'DE0001234567', // German ISIN
        'US0378331005', // Apple Inc
        'LU0123456789', // Luxembourg fund
        'FR0000120073', // French ISIN
        'GB0002162385', // UK ISIN
        'CH0038863350', // Swiss ISIN
        'NL0000009165', // Dutch ISIN
        'IE00B4L5Y983'  // Irish ISIN
      ];

      validISINs.forEach(isin => {
        const isValid = PortfolioMathematics.validateISINFormat(isin);
        expect(isValid).toBe(true);
      });
    });

    it('should detect invalid ISIN formats', () => {
      const invalidISINs = [
        'DE000123456',   // Too short
        'DE00012345678', // Too long
        '123456789012',  // No country code
        'DE000123456A',  // Invalid character
        'XX0001234567',  // Invalid country code
        '',              // Empty
        'DE-001234567',  // Invalid separator
        'de0001234567'   // Lowercase
      ];

      invalidISINs.forEach(isin => {
        const isValid = PortfolioMathematics.validateISINFormat(isin);
        expect(isValid).toBe(false);
      });
    });

    it('should validate ISIN check digit calculation', () => {
      // Test known valid ISINs with correct check digits
      const validISINsWithCheckDigits = [
        { isin: 'US0378331005', expectedValid: true },  // Apple Inc
        { isin: 'US0378331006', expectedValid: false }, // Apple Inc with wrong check digit
        { isin: 'DE0007164600', expectedValid: true },  // SAP SE
        { isin: 'DE0007164601', expectedValid: false }  // SAP SE with wrong check digit
      ];

      validISINsWithCheckDigits.forEach(({ isin, expectedValid }) => {
        const isValid = PortfolioMathematics.validateISINChecksum(isin);
        expect(isValid).toBe(expectedValid);
      });
    });

    it('should handle ISIN validation in portfolio context', () => {
      const portfolioWithISINs = [
        { name: 'Apple Inc', assetClass: 'Aktien', value: 100000, isin: 'US0378331005' }, // Valid
        { name: 'Microsoft', assetClass: 'Aktien', value: 80000, isin: 'US5949181045' }, // Valid
        { name: 'Invalid Fund', assetClass: 'Anleihen', value: 50000, isin: 'INVALID123' }, // Invalid
        { name: 'Missing ISIN', assetClass: 'Liquidität/Cash', value: 20000, isin: undefined } // Missing
      ];

      const allocations = [
        { category: 'Aktien', percentage: 72.0 },
        { category: 'Anleihen', percentage: 20.0 },
        { category: 'Liquidität/Cash', percentage: 8.0 }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(
        portfolioWithISINs as any,
        allocations
      );

      expect(result.issues.some(issue => issue.code === 'ISIN_001')).toBe(true);
      expect(result.issues.some(issue => issue.message.includes('Invalid Fund'))).toBe(true);
      expect(result.issues.some(issue => issue.message.includes('Missing ISIN'))).toBe(true);
    });

    it('should validate ISIN country codes for German funds', () => {
      const germanFunds = [
        { name: 'German DAX Fund', assetClass: 'Aktien', value: 200000, isin: 'DE0001234567' },
        { name: 'Frankfurt Bond', assetClass: 'Anleihen', value: 150000, isin: 'DE0009876543' },
        { name: 'US Fund in German Portfolio', assetClass: 'Aktien', value: 100000, isin: 'US0378331005' } // Valid but foreign
      ];

      const allocations = [
        { category: 'Aktien', percentage: 66.67 },
        { category: 'Anleihen', percentage: 33.33 }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(
        germanFunds,
        allocations
      );

      // Should not have ISIN format issues
      expect(result.issues.filter(issue => issue.code === 'ISIN_001')).toHaveLength(0);
      
      // But might have geographic concentration warnings
      expect(result.complianceScore).toBeGreaterThan(80);
    });
  });

  describe('Comprehensive German Compliance Edge Cases', () => {
    it('should handle mixed German and EU fund structures', () => {
      const mixedEUFunds = [
        { name: 'German Stock Fund', assetClass: 'Aktien', value: 200000, isin: 'DE0001234567' },
        { name: 'Luxembourg UCITS', assetClass: 'Aktien', value: 150000, isin: 'LU0123456789' },
        { name: 'Irish UCITS', assetClass: 'Anleihen', value: 100000, isin: 'IE00B4L5Y983' },
        { name: 'French Fund', assetClass: 'Anleihen', value: 100000, isin: 'FR0000120073' },
        { name: 'Austrian Fund', assetClass: 'Immobilien', value: 50000, isin: 'AT0000A05P16' }
      ];

      const allocations = [
        { category: 'Aktien', percentage: 58.33 },
        { category: 'Anleihen', percentage: 33.33 },
        { category: 'Immobilien', percentage: 8.33 }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(
        mixedEUFunds,
        allocations
      );

      expect(result.isCompliant).toBe(true);
      expect(result.bafin.assetClassification).toBe(true);
      expect(result.bafin.ucitsCompliance).toBe(true);
    });

    it('should validate complex alternative investment structures', () => {
      const complexAIFs = [
        { name: 'German Closed-End Fund', assetClass: 'Alternative Investments', value: 300000, isin: 'DE0001234567' },
        { name: 'Luxembourg Private Equity', assetClass: 'Alternative Investments', value: 200000, isin: 'LU0123456789' },
        { name: 'Infrastructure Fund', assetClass: 'Immobilien', value: 150000, isin: 'DE0009876543' },
        { name: 'Hedge Fund Strategy', assetClass: 'Alternative Investments', value: 100000, isin: 'LU0987654321' },
        { name: 'Traditional Equity', assetClass: 'Aktien', value: 250000, isin: 'DE0011223344' }
      ];

      const allocations = [
        { category: 'Alternative Investments', percentage: 60.0 },
        { category: 'Immobilien', percentage: 15.0 },
        { category: 'Aktien', percentage: 25.0 }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(
        complexAIFs,
        allocations
      );

      // High alternative investment allocation should trigger warnings
      expect(result.issues.some(issue => issue.severity === ValidationSeverity.Warning)).toBe(true);
      expect(result.complianceScore).toBeGreaterThan(75); // Still compliant but with warnings
    });

    it('should validate German tax-transparent fund structures', () => {
      const taxTransparentFunds = [
        { name: 'German Equity Fund (Thesaurierend)', assetClass: 'Aktien', value: 300000, isin: 'DE0001234567' },
        { name: 'German Bond Fund (Ausschüttend)', assetClass: 'Anleihen', value: 200000, isin: 'DE0009876543' },
        { name: 'Mixed Fund (Vorabpauschale)', assetClass: 'Mischfonds', value: 150000, isin: 'DE0011223344' },
        { name: 'ETF (Swap-basiert)', assetClass: 'Aktien', value: 100000, isin: 'DE0055667788' }
      ];

      const allocations = [
        { category: 'Aktien', percentage: 52.63 },
        { category: 'Anleihen', percentage: 26.32 },
        { category: 'Mischfonds', percentage: 19.74 }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(
        taxTransparentFunds,
        allocations
      );

      expect(result.isCompliant).toBe(true);
      expect(result.bafin.reportingStandards).toBe(true);
    });

    it('should handle regulatory reporting thresholds', () => {
      // Test reporting thresholds for different fund types
      const largePortfolio = [
        { name: 'Large Cap Equity', assetClass: 'Aktien', value: 5000000, isin: 'DE0001234567' },
        { name: 'Government Bonds', assetClass: 'Anleihen', value: 3000000, isin: 'DE0001102309' },
        { name: 'Money Market', assetClass: 'Liquidität/Cash', value: 2000000, isin: 'DE0009876543' }
      ];

      const allocations = [
        { category: 'Aktien', percentage: 50.0 },
        { category: 'Anleihen', percentage: 30.0 },
        { category: 'Liquidität/Cash', percentage: 20.0 }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(
        largePortfolio,
        allocations
      );

      // Large portfolios might trigger additional reporting requirements
      expect(result.complianceScore).toBeGreaterThan(85);
      expect(result.bafin.reportingStandards).toBe(true);
    });

    it('should validate sustainability disclosure requirements', () => {
      const sustainabilityFunds = [
        { 
          name: 'ESG Equity Fund', 
          assetClass: 'Aktien', 
          value: 400000, 
          isin: 'DE0001234567',
          sustainabilityProfile: 'Article 9' // SFDR classification
        },
        { 
          name: 'Green Bond Fund', 
          assetClass: 'Anleihen', 
          value: 300000, 
          isin: 'LU0123456789',
          sustainabilityProfile: 'Article 8'
        },
        { 
          name: 'Traditional Fund', 
          assetClass: 'Aktien', 
          value: 300000, 
          isin: 'DE0009876543',
          sustainabilityProfile: 'Article 6'
        }
      ];

      const allocations = [
        { category: 'Aktien', percentage: 70.0 },
        { category: 'Anleihen', percentage: 30.0 }
      ];

      const result = PortfolioMathematics.validateGermanFinancialStandards(
        sustainabilityFunds as any,
        allocations
      );

      // Should validate sustainability classification compliance
      expect(result.isCompliant).toBe(true);
      expect(result.complianceScore).toBeGreaterThan(90);
    });
  });
});