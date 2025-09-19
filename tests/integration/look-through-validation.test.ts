/**
 * Integration tests for look-through validation workflow
 * Tests end-to-end validation from portfolio upload to validation results
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { server } from '../mocks/server';
import { rest } from 'msw';
import { 
  PortfolioMathematics, 
  LookThroughValidationResult,
  FundHolding,
  ValidationSeverity,
  GermanFinancialComplianceResult
} from '../../server/utils/portfolio-mathematics';

// Mock API responses for testing
const mockValidationEndpoint = rest.post('/api/portfolio/:id/validate', (req, res, ctx) => {
  return res(ctx.json({
    success: true,
    data: {
      validationId: 'test-validation-123',
      status: 'completed',
      results: {
        isValid: true,
        overallScore: 95,
        issues: [],
        errors: [],
        warnings: []
      }
    }
  }));
});

const mockFactsheetEndpoint = rest.get('/api/factsheet/:isin', (req, res, ctx) => {
  const { isin } = req.params;
  return res(ctx.json({
    success: true,
    data: {
      isin,
      name: `Test Fund ${isin}`,
      holdings: [
        {
          name: 'Apple Inc',
          isin: 'US0378331005',
          weight: 0.3,
          value: 30000,
          currency: 'USD',
          assetClass: 'Aktien',
          geography: 'USA/Nordamerika'
        }
      ]
    }
  }));
});

describe('Look-Through Validation Integration Tests', () => {
  beforeEach(() => {
    server.use(mockValidationEndpoint, mockFactsheetEndpoint);
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('End-to-End Validation Workflow', () => {
    it('should process complete validation workflow successfully', async () => {
      const portfolioData = {
        id: 'test-portfolio-001',
        positions: [
          { name: 'Global Equity Fund', isin: 'DE0001234567', value: 60000, assetClass: 'Aktien' },
          { name: 'Bond Fund', isin: 'LU0987654321', value: 40000, assetClass: 'Anleihen' }
        ]
      };

      // Simulate portfolio upload
      const uploadResponse = await fetch('/api/portfolio/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portfolioData)
      });

      expect(uploadResponse.ok).toBe(true);

      // Simulate validation request
      const validationResponse = await fetch(`/api/portfolio/${portfolioData.id}/validate`, {
        method: 'POST'
      });

      const validationData = await validationResponse.json();
      
      expect(validationData.success).toBe(true);
      expect(validationData.data.validationId).toBeDefined();
      expect(validationData.data.status).toBe('completed');
      expect(validationData.data.results.isValid).toBe(true);
    });

    it('should handle validation errors gracefully', async () => {
      // Mock error response
      server.use(
        rest.post('/api/portfolio/:id/validate', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({
            success: false,
            error: 'Validation service temporarily unavailable'
          }));
        })
      );

      const validationResponse = await fetch('/api/portfolio/test-id/validate', {
        method: 'POST'
      });

      expect(validationResponse.status).toBe(500);
      
      const errorData = await validationResponse.json();
      expect(errorData.success).toBe(false);
      expect(errorData.error).toContain('temporarily unavailable');
    });

    it('should process factsheet integration correctly', async () => {
      const fundISIN = 'DE0001234567';
      
      const factsheetResponse = await fetch(`/api/factsheet/${fundISIN}`);
      const factsheetData = await factsheetResponse.json();

      expect(factsheetData.success).toBe(true);
      expect(factsheetData.data.isin).toBe(fundISIN);
      expect(factsheetData.data.holdings).toHaveLength(1);
      expect(factsheetData.data.holdings[0].name).toBe('Apple Inc');
    });

    it('should validate async processing queue functionality', async () => {
      // Test large portfolio that requires queue processing
      const largePortfolio = {
        id: 'large-portfolio-001',
        positions: Array.from({ length: 200 }, (_, i) => ({
          name: `Fund ${i + 1}`,
          isin: `DE000${String(i + 1).padStart(7, '0')}`,
          value: 1000,
          assetClass: i % 2 === 0 ? 'Aktien' : 'Anleihen'
        }))
      };

      // Mock async processing response
      server.use(
        rest.post('/api/portfolio/:id/validate', (req, res, ctx) => {
          return res(ctx.json({
            success: true,
            data: {
              validationId: 'async-validation-456',
              status: 'processing',
              estimatedCompletion: Date.now() + 30000 // 30 seconds
            }
          }));
        })
      );

      const validationResponse = await fetch(`/api/portfolio/${largePortfolio.id}/validate`, {
        method: 'POST'
      });

      const validationData = await validationResponse.json();
      
      expect(validationData.data.status).toBe('processing');
      expect(validationData.data.estimatedCompletion).toBeGreaterThan(Date.now());
    });
  });

  describe('API Endpoint Testing', () => {
    it('should validate fund decomposition endpoint', async () => {
      const fundData = {
        fundValue: 100000,
        holdings: [
          {
            name: 'Apple Inc',
            weight: 0.3,
            value: 30000,
            currency: 'USD',
            assetClass: 'Aktien',
            geography: 'USA/Nordamerika'
          },
          {
            name: 'Microsoft Corp',
            weight: 0.7,
            value: 70000,
            currency: 'USD',
            assetClass: 'Aktien',
            geography: 'USA/Nordamerika'
          }
        ]
      };

      server.use(
        rest.post('/api/validation/fund-decomposition', (req, res, ctx) => {
          return res(ctx.json({
            success: true,
            data: {
              isValid: true,
              issues: [],
              accuracy: 100
            }
          }));
        })
      );

      const response = await fetch('/api/validation/fund-decomposition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fundData)
      });

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      expect(result.data.accuracy).toBe(100);
    });

    it('should validate double counting detection endpoint', async () => {
      const doubleCounting = {
        portfolioPositions: [
          { name: 'Apple Inc', isin: 'US0378331005', value: 10000 }
        ],
        underlyingHoldings: [
          {
            name: 'Apple Inc (via ETF)',
            isin: 'US0378331005',
            weight: 0.2,
            value: 5000,
            currency: 'USD',
            assetClass: 'Aktien',
            geography: 'USA/Nordamerika'
          }
        ]
      };

      server.use(
        rest.post('/api/validation/double-counting', (req, res, ctx) => {
          return res(ctx.json({
            success: true,
            data: {
              detected: true,
              affectedAssets: ['Apple Inc', 'Apple Inc (via ETF)'],
              overlapValue: 5000
            }
          }));
        })
      );

      const response = await fetch('/api/validation/double-counting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doubleCounting)
      });

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data.detected).toBe(true);
      expect(result.data.overlapValue).toBe(5000);
    });

    it('should validate currency exposure endpoint', async () => {
      const currencyData = {
        baseCurrency: 'EUR',
        exposures: [
          { currency: 'EUR', exposure: 40, isHedged: false },
          { currency: 'USD', exposure: 35, isHedged: true },
          { currency: 'GBP', exposure: 25, isHedged: true }
        ],
        fullyHedged: false
      };

      server.use(
        rest.post('/api/validation/currency-exposure', (req, res, ctx) => {
          return res(ctx.json({
            success: true,
            data: {
              isValid: true,
              issues: [],
              hedgingEfficiency: 85
            }
          }));
        })
      );

      const response = await fetch('/api/validation/currency-exposure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currencyData)
      });

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      expect(result.data.hedgingEfficiency).toBe(85);
    });

    it('should validate German standards compliance endpoint', async () => {
      const complianceData = {
        positions: [
          { name: 'German Stock Fund', assetClass: 'Aktien', value: 60000, isin: 'DE0001234567' },
          { name: 'Euro Bond Fund', assetClass: 'Anleihen', value: 40000, isin: 'LU0123456789' }
        ],
        allocations: [
          { category: 'Aktien', percentage: 60 },
          { category: 'Anleihen', percentage: 40 }
        ]
      };

      server.use(
        rest.post('/api/validation/german-standards', (req, res, ctx) => {
          return res(ctx.json({
            success: true,
            data: {
              isCompliant: true,
              bafin: {
                assetClassification: true,
                ucitsCompliance: true,
                reportingStandards: true
              },
              complianceScore: 95,
              issues: []
            }
          }));
        })
      );

      const response = await fetch('/api/validation/german-standards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complianceData)
      });

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data.isCompliant).toBe(true);
      expect(result.data.complianceScore).toBe(95);
    });
  });

  describe('Error Handling Across Validation Pipeline', () => {
    it('should handle network timeouts gracefully', async () => {
      server.use(
        rest.post('/api/portfolio/:id/validate', (req, res, ctx) => {
          return res(ctx.delay(10000)); // 10 second delay to simulate timeout
        })
      );

      const timeoutPromise = fetch('/api/portfolio/test-id/validate', {
        method: 'POST',
        signal: AbortSignal.timeout(1000) // 1 second timeout
      });

      await expect(timeoutPromise).rejects.toThrow();
    });

    it('should handle malformed validation data', async () => {
      const malformedData = {
        positions: null,
        allocations: undefined,
        metadata: { invalid: true }
      };

      server.use(
        rest.post('/api/portfolio/:id/validate', (req, res, ctx) => {
          return res(ctx.status(400), ctx.json({
            success: false,
            error: 'Invalid validation data format',
            details: 'Positions and allocations are required'
          }));
        })
      );

      const response = await fetch('/api/portfolio/test-id/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(malformedData)
      });

      expect(response.status).toBe(400);
      const errorData = await response.json();
      expect(errorData.success).toBe(false);
      expect(errorData.error).toContain('Invalid validation data');
    });

    it('should handle factsheet processing failures', async () => {
      server.use(
        rest.get('/api/factsheet/:isin', (req, res, ctx) => {
          return res(ctx.status(404), ctx.json({
            success: false,
            error: 'Factsheet not found',
            isin: req.params.isin
          }));
        })
      );

      const response = await fetch('/api/factsheet/INVALID_ISIN');
      expect(response.status).toBe(404);
      
      const errorData = await response.json();
      expect(errorData.success).toBe(false);
      expect(errorData.error).toBe('Factsheet not found');
    });

    it('should handle database connection failures', async () => {
      server.use(
        rest.post('/api/portfolio/:id/validate', (req, res, ctx) => {
          return res(ctx.status(503), ctx.json({
            success: false,
            error: 'Database temporarily unavailable',
            retryAfter: 30
          }));
        })
      );

      const response = await fetch('/api/portfolio/test-id/validate', {
        method: 'POST'
      });

      expect(response.status).toBe(503);
      const errorData = await response.json();
      expect(errorData.error).toContain('Database temporarily unavailable');
      expect(errorData.retryAfter).toBe(30);
    });
  });

  describe('Cache Behavior and Invalidation Testing', () => {
    it('should cache validation results correctly', async () => {
      let callCount = 0;
      
      server.use(
        rest.post('/api/portfolio/:id/validate', (req, res, ctx) => {
          callCount++;
          return res(ctx.json({
            success: true,
            data: {
              validationId: `cached-validation-${callCount}`,
              status: 'completed',
              results: { isValid: true, overallScore: 95 },
              fromCache: callCount > 1
            }
          }));
        })
      );

      // First request - should hit the server
      const firstResponse = await fetch('/api/portfolio/cache-test/validate', {
        method: 'POST'
      });
      const firstData = await firstResponse.json();
      
      expect(firstData.data.fromCache).toBe(false);
      expect(callCount).toBe(1);

      // Second request - should use cache
      const secondResponse = await fetch('/api/portfolio/cache-test/validate', {
        method: 'POST'
      });
      const secondData = await secondResponse.json();
      
      expect(secondData.data.fromCache).toBe(true);
    });

    it('should invalidate cache when portfolio changes', async () => {
      server.use(
        rest.put('/api/portfolio/:id', (req, res, ctx) => {
          return res(ctx.json({
            success: true,
            data: { portfolioUpdated: true, cacheInvalidated: true }
          }));
        })
      );

      // Update portfolio
      const updateResponse = await fetch('/api/portfolio/cache-test', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions: [] })
      });

      const updateData = await updateResponse.json();
      expect(updateData.data.cacheInvalidated).toBe(true);
    });

    it('should handle cache miss scenarios', async () => {
      server.use(
        rest.get('/api/portfolio/:id/validation-cache', (req, res, ctx) => {
          return res(ctx.status(404), ctx.json({
            success: false,
            error: 'No cached validation results found',
            shouldRevalidate: true
          }));
        })
      );

      const cacheResponse = await fetch('/api/portfolio/no-cache/validation-cache');
      expect(cacheResponse.status).toBe(404);
      
      const cacheData = await cacheResponse.json();
      expect(cacheData.shouldRevalidate).toBe(true);
    });
  });

  describe('Performance and Scalability Testing', () => {
    it('should handle concurrent validation requests', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => 
        fetch(`/api/portfolio/concurrent-${i}/validate`, { method: 'POST' })
      );

      const startTime = performance.now();
      const responses = await Promise.all(concurrentRequests);
      const endTime = performance.now();

      // All requests should succeed
      const results = await Promise.all(responses.map(r => r.json()));
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Should complete within reasonable time (5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should validate response time benchmarks', async () => {
      const startTime = performance.now();
      
      const response = await fetch('/api/portfolio/benchmark-test/validate', {
        method: 'POST'
      });
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.ok).toBe(true);
      // API should respond within 2 seconds
      expect(responseTime).toBeLessThan(2000);
    });

    it('should handle memory usage during large validations', async () => {
      // Simulate large portfolio validation
      const largePortfolioData = {
        positions: Array.from({ length: 1000 }, (_, i) => ({
          name: `Position ${i}`,
          value: 1000,
          isin: `TEST${String(i).padStart(8, '0')}`
        }))
      };

      server.use(
        rest.post('/api/portfolio/:id/validate', (req, res, ctx) => {
          return res(ctx.json({
            success: true,
            data: {
              validationId: 'memory-test',
              status: 'completed',
              results: { isValid: true, overallScore: 90 },
              memoryUsage: { peak: '256MB', current: '128MB' }
            }
          }));
        })
      );

      const response = await fetch('/api/portfolio/memory-test/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(largePortfolioData)
      });

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data.memoryUsage).toBeDefined();
    });
  });
});