import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes';

describe('SAA Portfolio Optimization Endpoint', () => {
  let app: express.Express;

  beforeEach(async () => {
    // WICHTIG: Mocke Claude-Service
    vi.mock('../../server/services/claude-simple', () => ({
      claudeService: {
        optimizePortfolio: vi.fn().mockResolvedValue({
          optimizedAllocation: {
            'IE00B4L5Y983': 0.45, // MSCI World
            'IE00B1FZS798': 0.35, // Euro Gov Bonds
            'IE00B3DKXQ41': 0.20  // Euro Corp Bonds
          },
          expectedReturn: 0.065,
          expectedRisk: 0.120,
          sharpeRatio: 0.54,
          improvements: {
            returnImprovement: 0.008,
            riskReduction: 0.015,
            sharpeImprovement: 0.12
          },
          rebalancingActions: [
            {
              isin: 'IE00B4L5Y983',
              currentAllocation: 0.50,
              targetAllocation: 0.45,
              action: 'sell',
              amount: 5000
            }
          ]
        })
      }
    }));

    // Mocke Storage
    vi.mock('../../server/storage', () => ({
      storage: {
        getPortfolio: vi.fn().mockResolvedValue({
          id: 'test-portfolio-123',
          name: 'Test Portfolio',
          totalValue: '100000',
          analysisResults: {
            assetAllocation: [
              { assetClass: 'Equity', percentage: 50 },
              { assetClass: 'Bond', percentage: 50 }
            ]
          }
        }),
        updatePortfolio: vi.fn().mockResolvedValue(true)
      }
    }));

    app = express();
    app.use(express.json());
    await registerRoutes(app);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/saa/portfolios/:id/optimize', () => {
    it('sollte Portfolio-Optimierung starten und Job-ID zurückgeben', async () => {
      // ARRANGE
      const portfolioId = 'test-portfolio-123';
      const optimizationParams = {
        method: 'mean_variance',
        constraints: {
          maxSinglePosition: 0.3,
          minCash: 0.02
        },
        parameters: {
          riskAversion: 3,
          expectedReturns: {
            'Equity': 0.08,
            'Bond': 0.03
          },
          confidenceLevel: 0.95,
          transactionCosts: 0.001
        }
      };

      // ACT
      const response = await request(app)
        .post(`/api/saa/portfolios/${portfolioId}/optimize`)
        .send(optimizationParams)
        .expect(200);

      // ASSERT
      expect(response.body).toMatchObject({
        jobId: expect.stringMatching(/^opt_test-portfolio-123_\d+$/),
        status: 'processing',
        estimatedTime: 30,
        pollEndpoint: expect.stringMatching(/^\/api\/saa\/jobs\/opt_test-portfolio-123_\d+\/status$/)
      });
    });

    it('sollte Fehler bei nicht existierendem Portfolio zurückgeben', async () => {
      // ARRANGE
      const { storage } = await vi.importMock('../../server/storage');
      storage.getPortfolio.mockResolvedValue(null);

      const portfolioId = 'non-existent-portfolio';
      const optimizationParams = {
        method: 'mean_variance'
      };

      // ACT
      const response = await request(app)
        .post(`/api/saa/portfolios/${portfolioId}/optimize`)
        .send(optimizationParams)
        .expect(404);

      // ASSERT
      expect(response.body).toMatchObject({
        error: "Portfolio nicht gefunden"
      });
    });

    it('sollte verschiedene Optimierungsmethoden akzeptieren', async () => {
      // ARRANGE
      const portfolioId = 'test-portfolio-123';
      const methods = [
        'mean_variance',
        'risk_parity',
        'black_litterman',
        'hierarchical_risk_parity'
      ];

      // ACT & ASSERT
      for (const method of methods) {
        const response = await request(app)
          .post(`/api/saa/portfolios/${portfolioId}/optimize`)
          .send({
            method,
            constraints: {},
            parameters: {}
          })
          .expect(200);

        expect(response.body.jobId).toMatch(/^opt_/);
        expect(response.body.status).toBe('processing');
      }
    });

    it('sollte Constraints korrekt validieren und weiterleiten', async () => {
      // ARRANGE
      const portfolioId = 'test-portfolio-123';
      const complexConstraints = {
        method: 'mean_variance',
        constraints: {
          maxSinglePosition: 0.25,
          minCash: 0.05,
          maxTurnover: 0.15,
          sectorLimits: {
            'Technology': 0.30,
            'Healthcare': 0.20
          },
          regionLimits: {
            'US': 0.50,
            'Europe': 0.35,
            'Asia': 0.15
          },
          eslExclusions: ['tobacco', 'weapons']
        },
        parameters: {
          riskAversion: 2.5,
          rebalancingFrequency: 'quarterly',
          transactionCosts: 0.0015
        }
      };

      // ACT
      const response = await request(app)
        .post(`/api/saa/portfolios/${portfolioId}/optimize`)
        .send(complexConstraints)
        .expect(200);

      // ASSERT
      expect(response.body.status).toBe('processing');

      // Überprüfe dass Claude mit korrekten Parametern aufgerufen wird
      const { claudeService } = await vi.importMock('../../server/services/claude-simple');
      expect(claudeService.optimizePortfolio).toHaveBeenCalledWith({
        portfolioId,
        parameters: complexConstraints,
        portfolioData: expect.any(Object)
      });
    });

    it('sollte Claude Service-Fehler abfangen', async () => {
      // ARRANGE
      const { claudeService } = await vi.importMock('../../server/services/claude-simple');
      claudeService.optimizePortfolio.mockRejectedValue(new Error('Claude Optimization Error'));

      const portfolioId = 'test-portfolio-123';

      // ACT
      const response = await request(app)
        .post(`/api/saa/portfolios/${portfolioId}/optimize`)
        .send({
          method: 'mean_variance',
          constraints: {},
          parameters: {}
        })
        .expect(500);

      // ASSERT
      expect(response.body).toMatchObject({
        error: "Fehler beim Starten der Portfolio-Optimierung"
      });
    });

    it('sollte Job-ID eindeutig generieren', async () => {
      // ARRANGE
      const portfolioId = 'test-portfolio-123';
      const jobIds = new Set();

      // ACT: Mehrere Optimierungen parallel starten
      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .post(`/api/saa/portfolios/${portfolioId}/optimize`)
          .send({ method: 'mean_variance' })
      );

      const responses = await Promise.all(requests);

      // ASSERT
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.jobId).toMatch(/^opt_test-portfolio-123_\d+$/);
        jobIds.add(response.body.jobId);
      });

      // Alle Job-IDs sollten eindeutig sein
      expect(jobIds.size).toBe(5);
    });

    it('sollte asynchrone Optimierung korrekt ausführen', async () => {
      // ARRANGE
      const portfolioId = 'test-portfolio-123';
      const { storage } = await vi.importMock('../../server/storage');

      // ACT
      const response = await request(app)
        .post(`/api/saa/portfolios/${portfolioId}/optimize`)
        .send({
          method: 'mean_variance',
          constraints: { maxSinglePosition: 0.3 }
        })
        .expect(200);

      // ASSERT: Response sollte sofort kommen
      expect(response.body.status).toBe('processing');

      // Warte kurz für asynchrone Ausführung
      await new Promise(resolve => setTimeout(resolve, 100));

      // Portfolio sollte mit Optimierungsergebnissen aktualisiert werden
      expect(storage.updatePortfolio).toHaveBeenCalledWith(
        portfolioId,
        expect.objectContaining({
          optimizationResults: expect.any(Object),
          lastOptimization: expect.any(Date)
        })
      );
    });

    it('sollte leere Parameter-Objekte korrekt behandeln', async () => {
      // ARRANGE
      const portfolioId = 'test-portfolio-123';

      // ACT
      const response = await request(app)
        .post(`/api/saa/portfolios/${portfolioId}/optimize`)
        .send({}) // Leerer Body
        .expect(200);

      // ASSERT
      expect(response.body.status).toBe('processing');

      // Claude sollte mit leeren Parametern aufgerufen werden
      const { claudeService } = await vi.importMock('../../server/services/claude-simple');
      expect(claudeService.optimizePortfolio).toHaveBeenCalledWith({
        portfolioId,
        parameters: {},
        portfolioData: expect.any(Object)
      });
    });
  });
});