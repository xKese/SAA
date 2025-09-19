import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../../server/index';
import type { Server } from 'http';

describe('Portfolio Comparison API Integration Tests', () => {
  let server: Server;
  let baseUrl: string;
  let testPortfolioId: string;

  beforeAll(async () => {
    // Start test server
    server = await createServer(0); // Use random port
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 5000;
    baseUrl = `http://localhost:${port}`;

    // Upload a test portfolio for comparison tests
    const testPortfolio = `Name,ISIN,Wert
"Apple Inc.",US0378331005,50000.00
"BMW AG",DE0005190003,30000.00
"Bundesanleihe",DE0001102309,20000.00`;

    const formData = new FormData();
    formData.append('file', new Blob([testPortfolio], { type: 'text/csv' }), 'test-portfolio.csv');
    formData.append('name', 'Test Portfolio for Comparison');

    const uploadResponse = await fetch(`${baseUrl}/api/portfolios/upload`, {
      method: 'POST',
      body: formData
    });

    const uploadResult = await uploadResponse.json();
    testPortfolioId = uploadResult.portfolio.id;

    // Wait for analysis to complete
    let attempts = 0;
    while (attempts < 30) {
      const statusResponse = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}`);
      const portfolio = await statusResponse.json();
      
      if (portfolio.analysisStatus === 'completed') {
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
  });

  afterAll(() => {
    if (server) {
      server.close();
    }
  });

  describe('POST /api/portfolios/:id/analyze-change', () => {
    it('should analyze portfolio change impact successfully', async () => {
      const changeRequest = {
        changeType: 'buy',
        changes: [
          {
            instrumentName: 'Apple Inc.',
            isin: 'US0378331005',
            currentValue: 50000,
            newValue: 70000,
            changeAmount: 20000,
            instrumentType: 'Aktie'
          },
          {
            instrumentName: 'Tesla Inc.',
            isin: 'US88160R1014',
            currentValue: 0,
            newValue: 30000,
            changeAmount: 30000,
            instrumentType: 'Aktie'
          }
        ],
        scenarioName: 'Technologie-Fokus Strategie'
      };

      const response = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/analyze-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(changeRequest)
      });

      expect(response.ok).toBe(true);

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('portfolioId');
      expect(result.data).toHaveProperty('comparison');
      expect(result.data).toHaveProperty('validationResults');

      const comparison = result.data.comparison;
      expect(comparison).toHaveProperty('scenarioName', 'Technologie-Fokus Strategie');
      expect(comparison).toHaveProperty('assetAllocation');
      expect(comparison).toHaveProperty('riskMetrics');
      expect(comparison).toHaveProperty('summary');

      // Verify asset allocation comparison structure
      expect(Array.isArray(comparison.assetAllocation)).toBe(true);
      if (comparison.assetAllocation.length > 0) {
        const firstAllocation = comparison.assetAllocation[0];
        expect(firstAllocation).toHaveProperty('category');
        expect(firstAllocation).toHaveProperty('beforeValue');
        expect(firstAllocation).toHaveProperty('afterValue');
        expect(firstAllocation).toHaveProperty('changeAmount');
        expect(firstAllocation).toHaveProperty('beforePercentage');
        expect(firstAllocation).toHaveProperty('afterPercentage');
      }

      // Verify risk metrics comparison
      expect(Array.isArray(comparison.riskMetrics)).toBe(true);
      if (comparison.riskMetrics.length > 0) {
        const firstMetric = comparison.riskMetrics[0];
        expect(firstMetric).toHaveProperty('metric');
        expect(firstMetric).toHaveProperty('before');
        expect(firstMetric).toHaveProperty('after');
        expect(firstMetric).toHaveProperty('change');
        expect(firstMetric).toHaveProperty('impact');
      }
    });

    it('should reject invalid portfolio ID', async () => {
      const changeRequest = {
        changeType: 'buy',
        changes: [
          {
            instrumentName: 'Test',
            newValue: 1000,
            changeAmount: 1000
          }
        ],
        scenarioName: 'Invalid Test'
      };

      const response = await fetch(`${baseUrl}/api/portfolios/invalid-id/analyze-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(changeRequest)
      });

      expect(response.status).toBe(404);

      const result = await response.json();
      expect(result.error).toContain('Portfolio nicht gefunden');
    });

    it('should validate request schema', async () => {
      const invalidRequest = {
        changeType: 'invalid-type',
        changes: []
      };

      const response = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/analyze-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidRequest)
      });

      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.error).toContain('Ungültige Eingabedaten');
      expect(result.validationErrors).toBeDefined();
    });

    it('should handle empty changes array', async () => {
      const changeRequest = {
        changeType: 'buy',
        changes: [],
        scenarioName: 'Empty Changes Test'
      };

      const response = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/analyze-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(changeRequest)
      });

      // Should still process but with minimal changes
      expect(response.ok).toBe(true);

      const result = await response.json();
      expect(result.success).toBe(true);
    });
  });

  describe('POST /api/portfolios/:id/scenarios', () => {
    it('should analyze multiple scenarios successfully', async () => {
      const scenarioRequest = {
        scenarios: [
          {
            name: 'Konservativ',
            description: 'Erhöhung der Anleihenquote',
            changes: [
              {
                instrumentName: 'Bundesanleihe',
                currentValue: 20000,
                newValue: 40000,
                changeAmount: 20000
              }
            ]
          },
          {
            name: 'Aggressiv',
            description: 'Fokus auf Wachstumsaktien',
            changes: [
              {
                instrumentName: 'Apple Inc.',
                currentValue: 50000,
                newValue: 80000,
                changeAmount: 30000
              }
            ]
          }
        ],
        compareToBaseline: true,
        includeRiskMetrics: true
      };

      const response = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/scenarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scenarioRequest)
      });

      expect(response.ok).toBe(true);

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('scenarios');
      expect(result.data).toHaveProperty('baselinePortfolio');

      const scenarios = result.data.scenarios;
      expect(Array.isArray(scenarios)).toBe(true);
      expect(scenarios).toHaveLength(2);

      const konservativScenario = scenarios.find((s: any) => s.scenarioName === 'Konservativ');
      const aggressivScenario = scenarios.find((s: any) => s.scenarioName === 'Aggressiv');

      expect(konservativScenario).toBeDefined();
      expect(aggressivScenario).toBeDefined();
      expect(konservativScenario.analysis).toHaveProperty('comparison');
      expect(aggressivScenario.analysis).toHaveProperty('comparison');
    });

    it('should handle scenario with no baseline comparison', async () => {
      const scenarioRequest = {
        scenarios: [
          {
            name: 'Standalone Test',
            changes: [
              {
                instrumentName: 'BMW AG',
                currentValue: 30000,
                newValue: 40000,
                changeAmount: 10000
              }
            ]
          }
        ],
        compareToBaseline: false
      };

      const response = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/scenarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scenarioRequest)
      });

      expect(response.ok).toBe(true);

      const result = await response.json();
      expect(result.data.baselinePortfolio).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle portfolio not analyzed yet', async () => {
      // Create a new portfolio that hasn't been analyzed
      const newPortfolio = `Name,ISIN,Wert
"Test Position",DE0000000000,10000.00`;

      const formData = new FormData();
      formData.append('file', new Blob([newPortfolio], { type: 'text/csv' }), 'new-test.csv');
      formData.append('name', 'Unanalyzed Portfolio');

      const uploadResponse = await fetch(`${baseUrl}/api/portfolios/upload`, {
        method: 'POST',
        body: formData
      });

      const uploadResult = await uploadResponse.json();
      const newPortfolioId = uploadResult.portfolio.id;

      // Try to analyze change before portfolio analysis is complete
      const changeRequest = {
        changeType: 'buy',
        changes: [
          {
            instrumentName: 'Test Position',
            newValue: 20000,
            changeAmount: 10000
          }
        ],
        scenarioName: 'Premature Analysis'
      };

      const response = await fetch(`${baseUrl}/api/portfolios/${newPortfolioId}/analyze-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(changeRequest)
      });

      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.error).toContain('Portfolio-Analyse nicht abgeschlossen');
    });

    it('should handle malformed JSON', async () => {
      const response = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/analyze-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      });

      expect(response.status).toBe(400);
    });

    it('should handle missing required fields', async () => {
      const incompleteRequest = {
        changeType: 'buy'
        // Missing changes array
      };

      const response = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/analyze-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(incompleteRequest)
      });

      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.validationErrors).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle analysis within reasonable time', async () => {
      const changeRequest = {
        changeType: 'rebalance',
        changes: [
          {
            instrumentName: 'Apple Inc.',
            currentValue: 50000,
            newValue: 40000,
            changeAmount: -10000
          },
          {
            instrumentName: 'BMW AG',
            currentValue: 30000,
            newValue: 35000,
            changeAmount: 5000
          },
          {
            instrumentName: 'Bundesanleihe',
            currentValue: 20000,
            newValue: 25000,
            changeAmount: 5000
          }
        ],
        scenarioName: 'Performance Test Reallokation'
      };

      const startTime = Date.now();

      const response = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/analyze-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(changeRequest)
      });

      const duration = Date.now() - startTime;

      expect(response.ok).toBe(true);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      const result = await response.json();
      expect(result.data.processingTime).toBeDefined();
      expect(typeof result.data.processingTime).toBe('number');
    });
  });
});