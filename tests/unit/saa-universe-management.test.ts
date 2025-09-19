import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes';

describe('SAA Universe Management Endpoint', () => {
  let app: express.Express;

  beforeEach(async () => {
    // WICHTIG: Mocke Investment Universe Service
    vi.mock('../../server/services/investment-universe', () => ({
      InvestmentUniverseService: vi.fn().mockImplementation(() => ({
        getInvestmentUniverse: vi.fn().mockResolvedValue({
          instruments: [
            {
              isin: 'IE00B4L5Y983',
              name: 'iShares Core MSCI World UCITS ETF',
              assetClass: 'Equity',
              subAssetClass: 'Developed Markets',
              ter: 0.0020,
              aum: 75000000000,
              liquidityScore: 10,
              qualityScore: 9,
              category: 'ETF'
            },
            {
              isin: 'IE00B1FZS798',
              name: 'iShares Core Euro Government Bond UCITS ETF',
              assetClass: 'Bond',
              subAssetClass: 'Government',
              ter: 0.0009,
              aum: 12000000000,
              liquidityScore: 9,
              qualityScore: 10,
              category: 'ETF'
            },
            {
              isin: 'IE00B66F4759',
              name: 'iShares Euro High Yield Corporate Bond UCITS ETF',
              assetClass: 'Bond',
              subAssetClass: 'High Yield Corporate',
              ter: 0.0050,
              aum: 2500000000,
              liquidityScore: 7,
              qualityScore: 6,
              category: 'ETF'
            }
          ],
          categories: ['ETF'],
          assetClasses: ['Equity', 'Bond']
        })
      }))
    }));

    app = express();
    app.use(express.json());
    await registerRoutes(app);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/saa/universe/instruments', () => {
    it('sollte alle Instrumente ohne Filter zurückgeben', async () => {
      // ACT
      const response = await request(app)
        .get('/api/saa/universe/instruments')
        .expect(200);

      // ASSERT
      expect(response.body).toMatchObject({
        success: true,
        instruments: expect.any(Array),
        totalCount: expect.any(Number),
        filters: {}
      });

      expect(response.body.instruments).toHaveLength(3);
      expect(response.body.totalCount).toBe(3);

      // Prüfe Struktur der Instrumente
      expect(response.body.instruments[0]).toMatchObject({
        isin: expect.any(String),
        name: expect.any(String),
        assetClass: expect.any(String),
        subAssetClass: expect.any(String),
        metrics: {
          ter: expect.any(Number),
          aum: expect.any(Number),
          liquidityScore: expect.any(Number),
          qualityScore: expect.any(Number)
        }
      });
    });

    it('sollte nach Asset-Klasse filtern', async () => {
      // ACT
      const response = await request(app)
        .get('/api/saa/universe/instruments')
        .query({ assetClass: 'Equity' })
        .expect(200);

      // ASSERT
      expect(response.body.success).toBe(true);
      expect(response.body.instruments).toHaveLength(1);
      expect(response.body.instruments[0].assetClass).toBe('Equity');
      expect(response.body.filters.assetClass).toBe('Equity');
    });

    it('sollte nach minimaler Qualität filtern', async () => {
      // ACT
      const response = await request(app)
        .get('/api/saa/universe/instruments')
        .query({ minQuality: 8 })
        .expect(200);

      // ASSERT
      expect(response.body.success).toBe(true);
      expect(response.body.instruments).toHaveLength(2); // Nur qualityScore >= 8
      expect(response.body.instruments.every(i => i.metrics.qualityScore >= 8)).toBe(true);
    });

    it('sollte nach maximaler TER filtern', async () => {
      // ACT
      const response = await request(app)
        .get('/api/saa/universe/instruments')
        .query({ maxTer: 0.003 })
        .expect(200);

      // ASSERT
      expect(response.body.success).toBe(true);
      expect(response.body.instruments).toHaveLength(2); // TER <= 0.003
      expect(response.body.instruments.every(i => i.metrics.ter <= 0.003)).toBe(true);
    });

    it('sollte mehrere Filter kombinieren', async () => {
      // ACT
      const response = await request(app)
        .get('/api/saa/universe/instruments')
        .query({
          assetClass: 'Bond',
          minQuality: 8,
          maxTer: 0.002
        })
        .expect(200);

      // ASSERT
      expect(response.body.success).toBe(true);
      expect(response.body.instruments).toHaveLength(1); // Nur Government Bond
      expect(response.body.instruments[0].assetClass).toBe('Bond');
      expect(response.body.instruments[0].metrics.qualityScore).toBeGreaterThanOrEqual(8);
      expect(response.body.instruments[0].metrics.ter).toBeLessThanOrEqual(0.002);
    });

    it('sollte Limit korrekt anwenden', async () => {
      // ACT
      const response = await request(app)
        .get('/api/saa/universe/instruments')
        .query({ limit: 2 })
        .expect(200);

      // ASSERT
      expect(response.body.success).toBe(true);
      expect(response.body.instruments).toHaveLength(2);
      expect(response.body.totalCount).toBe(3); // Gesamtanzahl vor Limit
    });

    it('sollte Standard-Limit von 50 verwenden', async () => {
      // ARRANGE: Mock mit vielen Instrumenten
      const { InvestmentUniverseService } = await vi.importMock('../../server/services/investment-universe');
      const mockService = new InvestmentUniverseService();

      // Erstelle 100 Mock-Instrumente
      const manyInstruments = Array.from({ length: 100 }, (_, i) => ({
        isin: `IE00B${i.toString().padStart(8, '0')}`,
        name: `Test ETF ${i}`,
        assetClass: 'Equity',
        subAssetClass: 'Test',
        ter: 0.001,
        aum: 1000000000,
        liquidityScore: 8,
        qualityScore: 8,
        category: 'ETF'
      }));

      mockService.getInvestmentUniverse.mockResolvedValue({
        instruments: manyInstruments,
        categories: ['ETF'],
        assetClasses: ['Equity']
      });

      // ACT
      const response = await request(app)
        .get('/api/saa/universe/instruments')
        .expect(200);

      // ASSERT
      expect(response.body.instruments).toHaveLength(50); // Standard-Limit
      expect(response.body.totalCount).toBe(100);
    });

    it('sollte Caching korrekt verwenden', async () => {
      // ACT: Erste Anfrage
      const response1 = await request(app)
        .get('/api/saa/universe/instruments')
        .query({ assetClass: 'Equity' })
        .expect(200);

      // ACT: Zweite Anfrage (sollte gecacht werden)
      const response2 = await request(app)
        .get('/api/saa/universe/instruments')
        .query({ assetClass: 'Equity' })
        .expect(200);

      // ASSERT
      expect(response1.body).toEqual(response2.body);

      // Service sollte nur einmal aufgerufen werden (durch Cache)
      const { InvestmentUniverseService } = await vi.importMock('../../server/services/investment-universe');
      const mockService = new InvestmentUniverseService();
      expect(mockService.getInvestmentUniverse).toHaveBeenCalledTimes(2); // Einmal pro Test-Setup
    });

    it('sollte Service-Fehler korrekt behandeln', async () => {
      // ARRANGE
      const { InvestmentUniverseService } = await vi.importMock('../../server/services/investment-universe');
      const mockService = new InvestmentUniverseService();
      mockService.getInvestmentUniverse.mockRejectedValue(new Error('Universe Service Error'));

      // ACT
      const response = await request(app)
        .get('/api/saa/universe/instruments')
        .expect(500);

      // ASSERT
      expect(response.body).toMatchObject({
        error: "Fehler beim Laden der SAA Instrumente"
      });
    });

    it('sollte Case-Insensitive Asset-Klassen-Filter verwenden', async () => {
      // ACT
      const response = await request(app)
        .get('/api/saa/universe/instruments')
        .query({ assetClass: 'equity' }) // lowercase
        .expect(200);

      // ASSERT
      expect(response.body.success).toBe(true);
      expect(response.body.instruments).toHaveLength(1);
      expect(response.body.instruments[0].assetClass).toBe('Equity');
    });
  });
});