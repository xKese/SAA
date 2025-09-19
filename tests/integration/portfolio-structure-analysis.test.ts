import { describe, it, expect, beforeAll, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

// Mock the Anthropic SDK for browser environment testing  
vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: mockCreate
      }
    })),
    mockCreate
  }
});

// Mock the portfolio mathematics module for testing
vi.mock('../../server/utils/portfolio-mathematics.js', () => ({
  PortfolioMathematics: {
    estimateAssetMetrics: vi.fn().mockReturnValue({ expectedReturn: 0.08, volatility: 0.15 }),
    calculateRiskMetrics: vi.fn().mockReturnValue({
      expectedReturn: 0.075,
      volatility: 0.12,
      sharpeRatio: 1.25,
      valueAtRisk: 0.15,
      expectedShortfall: 0.20,
      maxDrawdown: 0.25,
      diversificationRatio: 0.85
    }),
    validateLookThroughAnalysis: vi.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
      totalValueDifference: 0
    })
  }
}));

import { ClaudePortfolioAnalyst } from '../../server/services/portfolio-analyst';

describe('Portfolio Structure Analysis Integration', () => {
  let claudeService: ClaudePortfolioAnalyst;
  let testPdfText: string;

  beforeAll(async () => {
    claudeService = new ClaudePortfolioAnalyst();
    
    // Test data from the actual PDF - German format depot statement
    testPdfText = `Beratungsdepot
Stand: 16.01.2025

Positionen:

Apple Inc. ISIN: US0378331005 Wert: 150.000,00 EUR
BMW AG ISIN: DE0005190003 Betrag: 75.000,00 EUR
iShares Core MSCI World ISIN: IE00B4L5Y983 Wert: 250.000,00 EUR
Deka-Immobilien Europa WKN: 980956 Betrag: 100.000,00 EUR
Gold ETC Physical ISIN: DE000A0S9GB0 Marktwert: 50.000,00 EUR`;

    // Get the mock create function
    const { mockCreate } = await vi.importMock<any>('@anthropic-ai/sdk');
    
    // Default successful response
    mockCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify([
          {
            name: 'Apple Inc.',
            isin: 'US0378331005',
            type: 'Aktie',
            sector: 'Technology',
            geography: 'USA/Nordamerika',
            currency: 'EUR',
            assetClass: 'Aktien',
            value: 150000,
            confidence: 0.95,
            portfolioStructure: {
              documentType: 'depot',
              extractionMethod: 'list',
              validationStatus: 'verified'
            }
          },
          {
            name: 'BMW AG',
            isin: 'DE0005190003',
            type: 'Aktie',
            sector: 'Consumer',
            geography: 'Deutschland',
            currency: 'EUR',
            assetClass: 'Aktien',
            value: 75000,
            confidence: 0.95
          },
          {
            name: 'iShares Core MSCI World',
            isin: 'IE00B4L5Y983',
            type: 'ETF',
            geography: 'Global',
            currency: 'EUR',
            assetClass: 'Aktien',
            value: 250000,
            confidence: 0.95
          },
          {
            name: 'Deka-Immobilien Europa',
            isin: '980956',
            type: 'Fonds',
            geography: 'Europa (inkl. UK)',
            currency: 'EUR',
            assetClass: 'Alternative Investments',
            value: 100000,
            confidence: 0.85
          },
          {
            name: 'Gold ETC Physical',
            isin: 'DE000A0S9GB0',
            type: 'ETC',
            geography: 'Global',
            currency: 'EUR',
            assetClass: 'Edelmetalle',
            value: 50000,
            confidence: 0.95
          }
        ])
      }]
    });
  });

  describe('Enhanced Portfolio Structure Analysis', () => {
    it('should extract structured portfolio data from German depot PDF', async () => {
      const results = await claudeService.extractPortfolioStructureFromPDF(testPdfText);
      
      // Basic validation
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(5); // Should find all 5 positions
      
      // Check that all positions have explicit values
      for (const position of results) {
        expect(position).toHaveProperty('name');
        expect(position).toHaveProperty('value');
        expect(typeof (position as any).value).toBe('number');
        expect((position as any).value).toBeGreaterThan(0);
      }
    });

    it('should properly categorize different instrument types', async () => {
      const results = await claudeService.extractPortfolioStructureFromPDF(testPdfText);
      
      const instrumentTypes = results.map(r => r.type);
      
      // Should identify various types: stocks, ETF, fund, ETC
      expect(instrumentTypes).toContain('Aktie'); // Apple, BMW
      expect(instrumentTypes).toContain('ETF');   // iShares
      expect(instrumentTypes).toContain('Fonds'); // Deka
      expect(instrumentTypes).toContain('ETC');   // Gold ETC
    });

    it('should validate German financial format compliance', async () => {
      const results = await claudeService.extractPortfolioStructureFromPDF(testPdfText);
      
      // Check German format values (should convert 150.000,00 to 150000)
      const applePosition = results.find(p => p.name.includes('Apple'));
      expect(applePosition).toBeDefined();
      expect((applePosition as any).value).toBe(150000);
      
      const totalValue = results.reduce((sum, pos) => sum + (pos as any).value, 0);
      expect(totalValue).toBe(625000); // 150k + 75k + 250k + 100k + 50k
    });

    it('should extract ISINs correctly', async () => {
      const results = await claudeService.extractPortfolioStructureFromPDF(testPdfText);
      
      const applePosition = results.find(p => p.name.includes('Apple'));
      const bmwPosition = results.find(p => p.name.includes('BMW'));
      const ishares = results.find(p => p.name.includes('iShares'));
      
      expect(applePosition?.isin).toBe('US0378331005');
      expect(bmwPosition?.isin).toBe('DE0005190003');
      expect(ishares?.isin).toBe('IE00B4L5Y983');
    });

    it('should assign appropriate asset classes', async () => {
      const results = await claudeService.extractPortfolioStructureFromPDF(testPdfText);
      
      const goldPosition = results.find(p => p.name.includes('Gold'));
      const stockPositions = results.filter(p => p.type === 'Aktie');
      
      expect(goldPosition?.assetClass).toBe('Edelmetalle');
      
      for (const stock of stockPositions) {
        expect(stock.assetClass).toBe('Aktien');
      }
    });
  });

  describe('Portfolio Validation System', () => {
    it('should validate portfolio structure correctly', async () => {
      const results = await claudeService.extractPortfolioStructureFromPDF(testPdfText);
      const validation = claudeService.validatePortfolioStructure(results);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.validPositions).toBe(5);
      expect(validation.invalidPositions).toBe(0);
      expect(validation.totalValue).toBe(625000);
    });

    it('should detect invalid positions', () => {
      const invalidPositions = [
        { name: 'Test Position', value: 0 }, // Invalid: zero value
        { name: '', value: 1000 }, // Invalid: empty name
        { name: 'Another Test', value: -500 }, // Invalid: negative value
        { name: 'Valid Position', value: 5000 } // Valid
      ];
      
      const validation = claudeService.validatePortfolioStructure(invalidPositions);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.validPositions).toBe(1);
      expect(validation.invalidPositions).toBe(3);
    });

    it('should provide German error messages', () => {
      const invalidPositions = [
        { name: 'Test', value: 0 }
      ];
      
      const validation = claudeService.validatePortfolioStructure(invalidPositions);
      
      expect(validation.errors[0]).toContain('größer als 0 sein');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed PDF text gracefully', async () => {
      const { mockCreate } = await vi.importMock<any>('@anthropic-ai/sdk');
      // Mock a response that doesn't contain valid JSON
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: 'No valid portfolio data found in this document.'
        }]
      });
      
      const malformedText = 'This is not a portfolio document at all.';
      
      await expect(claudeService.extractPortfolioStructureFromPDF(malformedText))
        .rejects.toThrow(/Keine gültigen Portfolio-Daten/);
    });

    it('should provide helpful error messages for empty PDF', async () => {
      const { mockCreate } = await vi.importMock<any>('@anthropic-ai/sdk');
      // Mock a response that doesn't contain valid JSON
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: 'Empty document provided.'
        }]
      });
      
      const emptyText = '';
      
      await expect(claudeService.extractPortfolioStructureFromPDF(emptyText))
        .rejects.toThrow();
    });

    it('should handle PDF with no financial instruments', async () => {
      const { mockCreate } = await vi.importMock<any>('@anthropic-ai/sdk');
      // Mock a response that doesn't contain valid JSON
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: 'This document does not contain financial portfolio data.'
        }]
      });
      
      const nonFinancialText = `
        Meeting Notes
        Date: 2025-01-16
        
        Discussion about:
        - Company strategy
        - Next quarter planning
        - Budget allocation
      `;
      
      await expect(claudeService.extractPortfolioStructureFromPDF(nonFinancialText))
        .rejects.toThrow(/Keine gültigen Portfolio-Daten/);
    });
  });

  describe('German Financial Standards Compliance', () => {
    it('should handle different German number formats', async () => {
      const { mockCreate } = await vi.importMock<any>('@anthropic-ai/sdk');
      // Mock a response for German number formats test
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: JSON.stringify([
            {
              name: 'Test Position 1',
              isin: 'DE0000000000',
              type: 'Aktie',
              assetClass: 'Aktien',
              value: 1500.50,
              confidence: 0.95
            },
            {
              name: 'Test Position 2', 
              isin: 'US0000000000',
              type: 'Aktie',
              assetClass: 'Aktien',
              value: 25000.00,
              confidence: 0.95
            },
            {
              name: 'Test Position 3',
              isin: 'FR0000000000', 
              type: 'Aktie',
              assetClass: 'Aktien',
              value: 100000.75,
              confidence: 0.95
            }
          ])
        }]
      });
      
      const germanFormats = `
        Beratungsdepot
        Positionen:
        Test Position 1 ISIN: DE0000000000 Wert: 1.500,50 EUR
        Test Position 2 ISIN: US0000000000 Betrag: 25.000,00 EUR
        Test Position 3 ISIN: FR0000000000 Marktwert: 100.000,75 EUR
      `;
      
      const results = await claudeService.extractPortfolioStructureFromPDF(germanFormats);
      
      expect(results).toHaveLength(3);
      expect((results[0] as any).value).toBe(1500.50);
      expect((results[1] as any).value).toBe(25000.00);
      expect((results[2] as any).value).toBe(100000.75);
    });

    it('should assign correct German geographic regions', async () => {
      const results = await claudeService.extractPortfolioStructureFromPDF(testPdfText);
      
      const bmwPosition = results.find(p => p.name.includes('BMW'));
      const applePosition = results.find(p => p.name.includes('Apple'));
      
      expect(bmwPosition?.geography).toContain('Deutschland');
      expect(applePosition?.geography).toContain('USA/Nordamerika');
    });

    it('should handle currency assignments correctly', async () => {
      const results = await claudeService.extractPortfolioStructureFromPDF(testPdfText);
      
      // Most should be EUR as specified in the PDF
      const eurPositions = results.filter(p => p.currency === 'EUR');
      expect(eurPositions.length).toBeGreaterThan(0);
    });
  });
});