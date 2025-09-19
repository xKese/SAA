import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes';

describe('SAA Rebalancing Calculation Endpoint', () => {
  let app: express.Express;

  beforeEach(async () => {
    // WICHTIG: Mocke Claude-Service
    vi.mock('../../server/services/claude-simple', () => ({
      claudeService: {
        calculateRebalancing: vi.fn().mockResolvedValue({
          rebalancing: {
            method: 'threshold',
            threshold: 0.05,
            targetAllocations: {
              'IE00B4L5Y983': 0.60, // MSCI World
              'IE00B1FZS798': 0.30, // Euro Gov Bonds
              'IE00B3DKXQ41': 0.10  // Euro Corp Bonds
            },
            currentAllocations: {
              'IE00B4L5Y983': 0.65,
              'IE00B1FZS798': 0.25,
              'IE00B3DKXQ41': 0.10
            }
          },
          trades: [
            {
              isin: 'IE00B4L5Y983',
              action: 'sell',
              amount: 5000,
              fromPercentage: 0.65,
              toPercentage: 0.60,
              reason: 'Rebalancing threshold exceeded'
            },
            {
              isin: 'IE00B1FZS798',
              action: 'buy',
              amount: 5000,
              fromPercentage: 0.25,
              toPercentage: 0.30,
              reason: 'Rebalancing threshold exceeded'
            }
          ],
          turnover: 0.05,
          estimatedCosts: 12.50,
          analysis: {
            deviations: {
              'IE00B4L5Y983': 0.05,
              'IE00B1FZS798': -0.05,
              'IE00B3DKXQ41': 0.00
            },
            triggerReason: 'threshold_exceeded',
            recommendation: 'Execute rebalancing to maintain target allocation'
          }
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
              { assetClass: 'Equity', percentage: 65 },
              { assetClass: 'Bond', percentage: 35 }
            ]
          }
        }),
        getPortfolioPositions: vi.fn().mockResolvedValue([
          {
            id: '1',
            portfolioId: 'test-portfolio-123',
            name: 'iShares Core MSCI World UCITS ETF',
            isin: 'IE00B4L5Y983',
            value: '65000',
            percentage: '65'
          },
          {
            id: '2',
            portfolioId: 'test-portfolio-123',
            name: 'iShares Core Euro Government Bond UCITS ETF',
            isin: 'IE00B1FZS798',
            value: '25000',
            percentage: '25'
          },
          {
            id: '3',
            portfolioId: 'test-portfolio-123',
            name: 'iShares Core Euro Corporate Bond UCITS ETF',
            isin: 'IE00B3DKXQ41',
            value: '10000',
            percentage: '10'
          }
        ])
      }
    }));

    app = express();
    app.use(express.json());
    await registerRoutes(app);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/saa/portfolios/:id/rebalancing/calculate', () => {
    it('sollte Rebalancing-Berechnung mit Standard-Methode durchführen', async () => {
      // ARRANGE
      const portfolioId = 'test-portfolio-123';

      // ACT
      const response = await request(app)
        .post(`/api/saa/portfolios/${portfolioId}/rebalancing/calculate`)
        .send({}) // Leerer Body für Standard-Parameter
        .expect(200);

      // ASSERT
      expect(response.body).toMatchObject({
        success: true,
        rebalancing: {
          method: 'threshold',
          targetAllocations: expect.any(Object),
          currentAllocations: expect.any(Object)
        },
        summary: {
          trades: 2,
          turnover: 0.05,
          costs: 12.50
        },
        analysis: expect.any(Object)
      });

      // WICHTIG: Teste dass Claude aufgerufen wurde
      const { claudeService } = await vi.importMock('../../server/services/claude-simple');
      expect(claudeService.calculateRebalancing).toHaveBeenCalledWith({
        portfolioId,
        method: 'threshold',
        constraints: {},
        currentPositions: expect.any(Array),
        totalValue: 100000
      });
    });

    it('sollte verschiedene Rebalancing-Methoden unterstützen', async () => {
      // ARRANGE
      const portfolioId = 'test-portfolio-123';
      const methods = [
        'threshold',
        'calendar',
        'volatility_trigger',
        'value_at_risk'
      ];

      // ACT & ASSERT
      for (const method of methods) {
        const response = await request(app)
          .post(`/api/saa/portfolios/${portfolioId}/rebalancing/calculate`)
          .send({ method })
          .expect(200);

        expect(response.body.success).toBe(true);

        const { claudeService } = await vi.importMock('../../server/services/claude-simple');
        expect(claudeService.calculateRebalancing).toHaveBeenCalledWith(
          expect.objectContaining({ method })
        );
      }
    });

    it('sollte Constraints korrekt verarbeiten', async () => {
      // ARRANGE
      const portfolioId = 'test-portfolio-123';
      const constraints = {
        maxTurnover: 0.10,
        minTradeAmount: 1000,
        maxTradeAmount: 50000,
        excludePositions: ['IE00B3DKXQ41'],
        transactionCosts: 0.0025,
        taxConsiderations: {
          maxRealizedGains: 5000,
          preferLossHarvesting: true
        }
      };

      // ACT
      const response = await request(app)
        .post(`/api/saa/portfolios/${portfolioId}/rebalancing/calculate`)
        .send({
          method: 'threshold',
          constraints
        })
        .expect(200);

      // ASSERT
      expect(response.body.success).toBe(true);

      const { claudeService } = await vi.importMock('../../server/services/claude-simple');
      expect(claudeService.calculateRebalancing).toHaveBeenCalledWith({
        portfolioId,
        method: 'threshold',
        constraints,
        currentPositions: expect.any(Array),
        totalValue: 100000
      });
    });

    it('sollte Fehler bei nicht existierendem Portfolio zurückgeben', async () => {
      // ARRANGE
      const { storage } = await vi.importMock('../../server/storage');
      storage.getPortfolio.mockResolvedValue(null);

      const portfolioId = 'non-existent-portfolio';

      // ACT
      const response = await request(app)
        .post(`/api/saa/portfolios/${portfolioId}/rebalancing/calculate`)
        .send({ method: 'threshold' })
        .expect(404);

      // ASSERT
      expect(response.body).toMatchObject({
        error: "Portfolio nicht gefunden"
      });
    });

    it('sollte Rebalancing-Analyse mit korrekten Positionen durchführen', async () => {
      // ARRANGE
      const portfolioId = 'test-portfolio-123';

      // ACT
      const response = await request(app)
        .post(`/api/saa/portfolios/${portfolioId}/rebalancing/calculate`)
        .send({ method: 'threshold' })
        .expect(200);

      // ASSERT
      const { claudeService } = await vi.importMock('../../server/services/claude-simple');
      expect(claudeService.calculateRebalancing).toHaveBeenCalledWith({
        portfolioId,
        method: 'threshold',
        constraints: {},
        currentPositions: [
          {
            id: '1',
            portfolioId: 'test-portfolio-123',
            name: 'iShares Core MSCI World UCITS ETF',
            isin: 'IE00B4L5Y983',
            value: '65000',
            percentage: '65'
          },
          {
            id: '2',
            portfolioId: 'test-portfolio-123',
            name: 'iShares Core Euro Government Bond UCITS ETF',
            isin: 'IE00B1FZS798',
            value: '25000',
            percentage: '25'
          },
          {
            id: '3',
            portfolioId: 'test-portfolio-123',
            name: 'iShares Core Euro Corporate Bond UCITS ETF',
            isin: 'IE00B3DKXQ41',
            value: '10000',
            percentage: '10'
          }
        ],
        totalValue: 100000
      });
    });

    it('sollte Trade-Summary korrekt berechnen', async () => {
      // ARRANGE
      const portfolioId = 'test-portfolio-123';

      // ACT
      const response = await request(app)
        .post(`/api/saa/portfolios/${portfolioId}/rebalancing/calculate`)
        .send({ method: 'threshold' })
        .expect(200);

      // ASSERT
      expect(response.body.summary).toMatchObject({
        trades: 2,
        turnover: 0.05,
        costs: 12.50
      });

      // Prüfe dass fallback Werte verwendet werden
      expect(typeof response.body.summary.trades).toBe('number');
      expect(typeof response.body.summary.turnover).toBe('number');
      expect(typeof response.body.summary.costs).toBe('number');
    });

    it('sollte Claude Service-Fehler abfangen', async () => {
      // ARRANGE
      const { claudeService } = await vi.importMock('../../server/services/claude-simple');
      claudeService.calculateRebalancing.mockRejectedValue(new Error('Claude Rebalancing Error'));

      const portfolioId = 'test-portfolio-123';

      // ACT
      const response = await request(app)
        .post(`/api/saa/portfolios/${portfolioId}/rebalancing/calculate`)
        .send({ method: 'threshold' })
        .expect(500);

      // ASSERT
      expect(response.body).toMatchObject({
        error: "Fehler bei der Rebalancing-Berechnung"
      });
    });

    it('sollte fallback Werte bei fehlenden Claude-Daten verwenden', async () => {
      // ARRANGE
      const { claudeService } = await vi.importMock('../../server/services/claude-simple');
      claudeService.calculateRebalancing.mockResolvedValue({
        rebalancing: { method: 'threshold' },
        // trades, turnover, estimatedCosts fehlen
        analysis: {}
      });

      const portfolioId = 'test-portfolio-123';

      // ACT
      const response = await request(app)
        .post(`/api/saa/portfolios/${portfolioId}/rebalancing/calculate`)
        .send({ method: 'threshold' })
        .expect(200);

      // ASSERT
      expect(response.body.summary).toMatchObject({
        trades: 0,    // fallback
        turnover: 0,  // fallback
        costs: 0      // fallback
      });
    });

    it('sollte komplexe Rebalancing-Szenarien verarbeiten', async () => {
      // ARRANGE
      const portfolioId = 'test-portfolio-123';
      const complexScenario = {
        method: 'volatility_trigger',
        constraints: {
          volatilityThreshold: 0.15,
          rebalancingFrequency: 'monthly',
          maxTurnover: 0.20,
          considerDividends: true,
          considerTaxes: true,
          minimumHoldingPeriod: 30,
          preferredTradingHours: '09:00-17:00',
          liquidityRequirements: {
            minDailyVolume: 1000000,
            maxBidAskSpread: 0.002
          }
        }
      };

      // ACT
      const response = await request(app)
        .post(`/api/saa/portfolios/${portfolioId}/rebalancing/calculate`)
        .send(complexScenario)
        .expect(200);

      // ASSERT
      expect(response.body.success).toBe(true);

      const { claudeService } = await vi.importMock('../../server/services/claude-simple');
      expect(claudeService.calculateRebalancing).toHaveBeenCalledWith({
        portfolioId,
        method: 'volatility_trigger',
        constraints: complexScenario.constraints,
        currentPositions: expect.any(Array),
        totalValue: 100000
      });
    });
  });
});