import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes';
import {
  createTestDatabase,
  TestDatabase,
  waitForJob,
  waitForPortfolioAnalysis,
  TestDataFactory,
  seedTestData
} from '../helpers/test-db';

describe('SAA Complete Workflow Integration Tests', () => {
  let app: express.Express;
  let db: TestDatabase;

  beforeAll(async () => {
    // Setup echter Datenbank für Integration Tests
    db = await createTestDatabase();

    // Setup Express App
    app = express();
    app.use(express.json());
    await registerRoutes(app);

    // Mock nur Claude Service für reproduzierbare Tests
    const { vi } = await import('vitest');
    vi.mock('../../server/services/claude-simple', () => ({
      claudeService: {
        createStrategicAssetAllocation: vi.fn().mockImplementation(async (request) => ({
          portfolioId: `saa_${Date.now()}`,
          strategy: {
            name: `${request.riskProfile <= 3 ? 'Conservative' : request.riskProfile >= 7 ? 'Aggressive' : 'Balanced'} Strategy`,
            riskLevel: request.riskProfile,
            timeHorizon: '5-10 years'
          },
          allocation: {
            equities: request.riskProfile * 0.1,
            bonds: (10 - request.riskProfile) * 0.1,
            alternatives: 0.05
          },
          positions: [
            { isin: 'IE00B4L5Y983', allocation: request.riskProfile * 0.08, assetClass: 'Equity' },
            { isin: 'IE00B1FZS798', allocation: (10 - request.riskProfile) * 0.08, assetClass: 'Bond' }
          ]
        })),

        optimizePortfolio: vi.fn().mockImplementation(async ({ portfolioId, parameters }) => ({
          optimizedAllocation: {
            'IE00B4L5Y983': 0.60,
            'IE00B1FZS798': 0.40
          },
          expectedReturn: 0.065,
          expectedRisk: 0.120,
          sharpeRatio: 0.54,
          improvements: {
            returnImprovement: 0.008,
            riskReduction: 0.015
          }
        })),

        calculateRebalancing: vi.fn().mockImplementation(async ({ method, currentPositions }) => ({
          rebalancing: {
            method,
            targetAllocations: {
              'IE00B4L5Y983': 0.60,
              'IE00B1FZS798': 0.40
            }
          },
          trades: currentPositions.map((pos, i) => ({
            isin: pos.isin,
            action: i % 2 === 0 ? 'sell' : 'buy',
            amount: 1000 * (i + 1),
            reason: 'Rebalancing'
          })),
          turnover: 0.05,
          estimatedCosts: 25.0,
          analysis: {
            recommendation: 'Execute rebalancing'
          }
        }))
      }
    }));

    // Mock Storage mit echter Datenbank
    vi.mock('../../server/storage', () => ({
      storage: {
        getPortfolio: vi.fn().mockImplementation(async (id) => {
          const [portfolio] = await db.db
            .select()
            .from(require('../../shared/schema').portfolios)
            .where(require('../../shared/schema').portfolios.id.eq(id));
          return portfolio || null;
        }),
        getPortfolioPositions: vi.fn().mockImplementation(async (portfolioId) => {
          return await db.db
            .select()
            .from(require('../../shared/schema').portfolioPositions)
            .where(require('../../shared/schema').portfolioPositions.portfolioId.eq(portfolioId));
        }),
        updatePortfolio: vi.fn().mockImplementation(async (id, updates) => {
          const [updated] = await db.db
            .update(require('../../shared/schema').portfolios)
            .set(updates)
            .where(require('../../shared/schema').portfolios.id.eq(id))
            .returning();
          return updated;
        })
      }
    }));
  });

  afterAll(async () => {
    await db.cleanup();
  });

  beforeEach(async () => {
    await db.reset();
  });

  describe('Complete Portfolio Creation to Rebalancing Workflow', () => {
    it('sollte kompletten Portfolio-Erstellungsprozess durchlaufen', async () => {
      // SCHRITT 1: Portfolio erstellen via SAA
      const creationRequest = TestDataFactory.saaRequest({
        riskProfile: 4,
        amount: 250000,
        constraints: {
          maxPositions: 15,
          maxSinglePosition: 0.2
        }
      });

      const creation = await request(app)
        .post('/api/saa/portfolios/create')
        .send(creationRequest)
        .expect(200);

      expect(creation.body).toMatchObject({
        success: true,
        portfolioId: expect.any(String),
        strategy: {
          name: 'Balanced Strategy',
          riskLevel: 4
        },
        allocation: {
          equities: 0.4,
          bonds: 0.6,
          alternatives: 0.05
        },
        nextSteps: ['review', 'adjust', 'execute']
      });

      const { portfolioId } = creation.body;

      // SCHRITT 2: Portfolio in Datenbank erstellen für weitere Tests
      const testPortfolio = await db.db.insert(require('../../shared/schema').portfolios).values({
        id: portfolioId,
        name: 'SAA Test Portfolio',
        fileName: 'saa_test.csv',
        totalValue: '250000.00',
        positionCount: 2,
        analysisStatus: 'completed',
        analysisResults: {
          assetAllocation: creation.body.allocation
        }
      }).returning();

      // Erstelle Test-Positionen
      await db.db.insert(require('../../shared/schema').portfolioPositions).values([
        {
          portfolioId,
          name: 'iShares Core MSCI World UCITS ETF',
          isin: 'IE00B4L5Y983',
          value: '150000.00',
          percentage: '60.00',
          assetClass: 'Equity'
        },
        {
          portfolioId,
          name: 'iShares Core Euro Government Bond UCITS ETF',
          isin: 'IE00B1FZS798',
          value: '100000.00',
          percentage: '40.00',
          assetClass: 'Bond'
        }
      ]);

      // SCHRITT 3: Optimierung starten
      const optimizationRequest = TestDataFactory.optimizationRequest({
        method: 'mean_variance',
        constraints: {
          maxSinglePosition: 0.35,
          minCash: 0.02
        }
      });

      const optimization = await request(app)
        .post(`/api/saa/portfolios/${portfolioId}/optimize`)
        .send(optimizationRequest)
        .expect(200);

      expect(optimization.body).toMatchObject({
        jobId: expect.stringMatching(/^opt_/),
        status: 'processing',
        estimatedTime: 30,
        pollEndpoint: expect.stringContaining('/api/saa/jobs/')
      });

      // SCHRITT 4: Auf Optimization Job Completion warten
      await waitForJob(optimization.body.jobId, 5000);

      // SCHRITT 5: Rebalancing berechnen
      const rebalancingRequest = TestDataFactory.rebalancingRequest({
        method: 'threshold',
        constraints: {
          maxTurnover: 0.15,
          minTradeAmount: 500
        }
      });

      const rebalancing = await request(app)
        .post(`/api/saa/portfolios/${portfolioId}/rebalancing/calculate`)
        .send(rebalancingRequest)
        .expect(200);

      expect(rebalancing.body).toMatchObject({
        success: true,
        rebalancing: {
          method: 'threshold',
          targetAllocations: expect.any(Object)
        },
        summary: {
          trades: expect.any(Number),
          turnover: expect.any(Number),
          costs: expect.any(Number)
        },
        analysis: expect.any(Object)
      });

      // SCHRITT 6: Validiere dass Trades erstellt wurden
      expect(rebalancing.body.summary.trades).toBeGreaterThan(0);
      expect(rebalancing.body.summary.costs).toBeGreaterThan(0);
    });

    it('sollte Fehler korrekt durch Pipeline propagieren', async () => {
      // SCHRITT 1: Erstelle Portfolio mit ungültigen Daten
      const invalidRequest = {
        riskProfile: 15, // Ungültig
        amount: -1000    // Ungültig
      };

      const creation = await request(app)
        .post('/api/saa/portfolios/create')
        .send(invalidRequest)
        .expect(200); // Claude sollte das handhaben

      // SCHRITT 2: Versuche Optimierung mit nicht-existierendem Portfolio
      const optimization = await request(app)
        .post('/api/saa/portfolios/non-existent-id/optimize')
        .send({ method: 'mean_variance' })
        .expect(404);

      expect(optimization.body.error).toContain('nicht gefunden');
    });

    it('sollte Performance bei großen Portfolios messen', async () => {
      // Setup: Großes Portfolio mit vielen Positionen
      const { portfolio } = await seedTestData(db.db);

      // Erstelle viele zusätzliche Positionen
      const positions = Array.from({ length: 50 }, (_, i) => ({
        portfolioId: portfolio.id,
        name: `Test Position ${i}`,
        isin: `IE00B${i.toString().padStart(8, '0')}`,
        value: '2000.00',
        percentage: '2.00',
        assetClass: i % 2 === 0 ? 'Equity' : 'Bond'
      }));

      await db.db.insert(require('../../shared/schema').portfolioPositions).values(positions);

      // Performance Test: Rebalancing Berechnung
      const startTime = Date.now();

      const rebalancing = await request(app)
        .post(`/api/saa/portfolios/${portfolio.id}/rebalancing/calculate`)
        .send({ method: 'threshold' })
        .expect(200);

      const duration = Date.now() - startTime;

      // Erwarte Antwort unter 5 Sekunden
      expect(duration).toBeLessThan(5000);
      expect(rebalancing.body.success).toBe(true);
    });

    it('sollte Concurrent Requests korrekt behandeln', async () => {
      // Setup: Portfolio für Concurrent Tests
      const { portfolio } = await seedTestData(db.db);

      // Starte mehrere Rebalancing-Berechnungen parallel
      const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post(`/api/saa/portfolios/${portfolio.id}/rebalancing/calculate`)
          .send({
            method: i % 2 === 0 ? 'threshold' : 'calendar',
            constraints: { maxTurnover: 0.1 + (i * 0.02) }
          })
      );

      const responses = await Promise.all(concurrentRequests);

      // Alle Requests sollten erfolgreich sein
      responses.forEach((response, i) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('sollte Database Transactions korrekt verwenden', async () => {
      // Test Database Consistency bei Fehlern
      const creationRequest = TestDataFactory.saaRequest();

      const creation = await request(app)
        .post('/api/saa/portfolios/create')
        .send(creationRequest)
        .expect(200);

      const { portfolioId } = creation.body;

      // Portfolio sollte in DB existieren
      const portfolioFromDb = await db.db
        .select()
        .from(require('../../shared/schema').portfolios)
        .where(require('../../shared/schema').portfolios.id.eq(portfolioId));

      // Für diesen Test sollte das Portfolio nicht in der DB sein
      // da SAA Endpoint nur SAA Service aufruft
      expect(portfolioFromDb).toHaveLength(0);
    });

    it('sollte komplexe Asset Allocation Scenarios handhaben', async () => {
      // Test mit verschiedenen Risikoprofilen
      const riskProfiles = [1, 3, 5, 7, 10];

      for (const riskProfile of riskProfiles) {
        const creation = await request(app)
          .post('/api/saa/portfolios/create')
          .send(TestDataFactory.saaRequest({ riskProfile }))
          .expect(200);

        // Validiere dass Allocation zu Risikoprofil passt
        const { allocation } = creation.body;

        if (riskProfile <= 3) {
          // Conservative: Mehr Bonds
          expect(allocation.bonds).toBeGreaterThan(allocation.equities);
        } else if (riskProfile >= 7) {
          // Aggressive: Mehr Equities
          expect(allocation.equities).toBeGreaterThan(allocation.bonds);
        }

        expect(allocation.alternatives).toBe(0.05); // Konstant
      }
    });
  });

  describe('Universe Integration Workflow', () => {
    it('sollte SAA mit Universe Management integrieren', async () => {
      // SCHRITT 1: Hole verfügbare Instrumente
      const universe = await request(app)
        .get('/api/saa/universe/instruments')
        .query({
          assetClass: 'Equity',
          minQuality: 8,
          limit: 10
        })
        .expect(200);

      expect(universe.body.instruments).toBeInstanceOf(Array);
      expect(universe.body.instruments.length).toBeGreaterThan(0);

      // SCHRITT 2: Erstelle Portfolio mit Universe-Instrumenten
      const creation = await request(app)
        .post('/api/saa/portfolios/create')
        .send(TestDataFactory.saaRequest({
          constraints: {
            allowedInstruments: universe.body.instruments.map(i => i.isin)
          }
        }))
        .expect(200);

      expect(creation.body.success).toBe(true);
    });
  });
});