import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes';

describe('SAA Portfolio Creation Endpoint', () => {
  let app: express.Express;

  beforeEach(async () => {
    // WICHTIG: Mocke Claude-Service
    vi.mock('../../server/services/claude-simple', () => ({
      claudeService: {
        createStrategicAssetAllocation: vi.fn().mockResolvedValue({
          portfolioId: 'test-portfolio-123',
          strategy: {
            name: 'Conservative Growth',
            riskLevel: 3,
            timeHorizon: '5-10 years'
          },
          allocation: {
            equities: 0.60,
            bonds: 0.35,
            alternatives: 0.05
          },
          positions: [
            { isin: 'IE00B4L5Y983', allocation: 0.40, assetClass: 'Equity' },
            { isin: 'IE00B1FZS798', allocation: 0.35, assetClass: 'Bond' }
          ]
        })
      }
    }));

    app = express();
    app.use(express.json());
    await registerRoutes(app);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/saa/portfolios/create', () => {
    it('sollte Portfolio mit korrekter Allokation erstellen', async () => {
      // ARRANGE
      const request_data = {
        riskProfile: 3,
        amount: 100000,
        constraints: { maxPositions: 20 }
      };

      // ACT
      const response = await request(app)
        .post('/api/saa/portfolios/create')
        .send(request_data)
        .expect(200);

      // ASSERT
      expect(response.body).toMatchObject({
        success: true,
        portfolioId: expect.any(String),
        strategy: {
          name: expect.any(String),
          riskLevel: expect.any(Number)
        },
        allocation: expect.any(Object),
        nextSteps: ['review', 'adjust', 'execute']
      });

      expect(response.body.portfolioId).toBe('test-portfolio-123');
      expect(response.body.allocation.equities).toBe(0.60);
      expect(response.body.allocation.bonds).toBe(0.35);
    });

    it('sollte Fehler bei fehlenden Pflichtfeldern zurückgeben', async () => {
      // ARRANGE
      const invalidRequest = {
        // riskProfile fehlt
        amount: 100000
      };

      // ACT
      const response = await request(app)
        .post('/api/saa/portfolios/create')
        .send(invalidRequest)
        .expect(400);

      // ASSERT
      expect(response.body).toMatchObject({
        error: "Risikoprofil und Betrag sind erforderlich"
      });
    });

    it('sollte Fehler bei fehlendem Betrag zurückgeben', async () => {
      // ARRANGE
      const invalidRequest = {
        riskProfile: 3
        // amount fehlt
      };

      // ACT
      const response = await request(app)
        .post('/api/saa/portfolios/create')
        .send(invalidRequest)
        .expect(400);

      // ASSERT
      expect(response.body).toMatchObject({
        error: "Risikoprofil und Betrag sind erforderlich"
      });
    });

    it('sollte Constraints korrekt verarbeiten', async () => {
      // ARRANGE
      const requestWithConstraints = {
        riskProfile: 5,
        amount: 250000,
        constraints: {
          maxPositions: 15,
          maxSinglePosition: 0.1,
          excludeRegions: ['emerging_markets'],
          minESGScore: 7
        }
      };

      // ACT
      const response = await request(app)
        .post('/api/saa/portfolios/create')
        .send(requestWithConstraints)
        .expect(200);

      // ASSERT
      expect(response.body.success).toBe(true);
      expect(response.body.portfolioId).toBeDefined();
    });

    it('sollte Edge Case mit 0 EUR korrekt behandeln', async () => {
      // ARRANGE
      const zeroAmountRequest = {
        riskProfile: 3,
        amount: 0
      };

      // ACT
      const response = await request(app)
        .post('/api/saa/portfolios/create')
        .send(zeroAmountRequest)
        .expect(200); // Claude sollte das handhaben

      // ASSERT
      expect(response.body.success).toBe(true);
    });

    it('sollte Claude Service Fehler korrekt weiterleiten', async () => {
      // ARRANGE
      const { claudeService } = await vi.importMock('../../server/services/claude-simple');
      claudeService.createStrategicAssetAllocation.mockRejectedValue(
        new Error('Claude API Error')
      );

      const request_data = {
        riskProfile: 3,
        amount: 100000
      };

      // ACT
      const response = await request(app)
        .post('/api/saa/portfolios/create')
        .send(request_data)
        .expect(500);

      // ASSERT
      expect(response.body).toMatchObject({
        error: "Fehler bei der SAA Portfolio-Erstellung"
      });
    });

    it('sollte alle Risikoprofile von 1-10 akzeptieren', async () => {
      // ARRANGE & ACT & ASSERT
      for (let riskProfile = 1; riskProfile <= 10; riskProfile++) {
        const response = await request(app)
          .post('/api/saa/portfolios/create')
          .send({
            riskProfile,
            amount: 50000
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });
  });
});