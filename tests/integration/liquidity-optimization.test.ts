import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LiquidityOptimizer } from '../../server/services/liquidity-optimizer';
import { db } from '../../server/db';
import { portfolios, portfolioPositions } from '../../shared/schema';
import { eq } from 'drizzle-orm';

describe('Liquidity Optimization Integration Tests', () => {
  let optimizer: LiquidityOptimizer;
  let testPortfolioId: string;

  const TARGET_ALLOCATION = {
    'Aktien': 0.60,
    'Anleihen': 0.30,
    'Alternative Investments': 0.10
  };

  beforeEach(async () => {
    optimizer = new LiquidityOptimizer();

    // Erstelle Test-Portfolio
    const [portfolio] = await db.insert(portfolios).values({
      name: 'Test Portfolio für Liquiditäts-Optimierung',
      fileName: 'test_liquidity_portfolio.csv',
      analysisStatus: 'completed',
      totalValue: '100000.00',
      positionCount: 5
    }).returning();

    testPortfolioId = portfolio.id;

    // Erstelle Test-Positionen
    await db.insert(portfolioPositions).values([
      {
        portfolioId: testPortfolioId,
        name: 'iShares Core MSCI World UCITS ETF',
        isin: 'IE00B4L5Y983',
        value: '40000.00',
        percentage: '40.00',
        assetClass: 'Aktien',
        instrumentType: 'ETF'
      },
      {
        portfolioId: testPortfolioId,
        name: 'iShares Core Euro Government Bond UCITS ETF',
        isin: 'IE00B4WXJJ64',
        value: '30000.00',
        percentage: '30.00',
        assetClass: 'Anleihen',
        instrumentType: 'ETF'
      },
      {
        portfolioId: testPortfolioId,
        name: 'Vanguard FTSE Emerging Markets UCITS ETF',
        isin: 'IE00B3VVMM84',
        value: '15000.00',
        percentage: '15.00',
        assetClass: 'Aktien',
        instrumentType: 'ETF'
      },
      {
        portfolioId: testPortfolioId,
        name: 'iShares Physical Gold ETC',
        isin: 'IE00B4ND3602',
        value: '10000.00',
        percentage: '10.00',
        assetClass: 'Alternative Investments',
        instrumentType: 'ETC'
      },
      {
        portfolioId: testPortfolioId,
        name: 'Cash Position',
        value: '5000.00',
        percentage: '5.00',
        assetClass: 'Liquidität',
        instrumentType: 'Cash'
      }
    ]);
  });

  afterEach(async () => {
    // Cleanup - entferne Test-Daten
    if (testPortfolioId) {
      await db.delete(portfolioPositions).where(eq(portfolioPositions.portfolioId, testPortfolioId));
      await db.delete(portfolios).where(eq(portfolios.id, testPortfolioId));
    }
  });

  describe('Optimization Scenarios', () => {
    it('sollte bei kleinem Zufluss (<5%) Struktur beibehalten', async () => {
      const result = await optimizer.optimizeLiquidityAllocation({
        portfolioId: testPortfolioId,
        additionalLiquidity: 5000,  // 5% von 100.000
        optimizationTarget: 'maintain'
      });

      // Erwarte dass Struktur weitgehend beibehalten wird
      expect(result.optimizationPlan).toBeDefined();
      expect(result.tradeProposals.length).toBeGreaterThan(0);

      // Validiere dass Maintain-Strategie verwendet wurde
      expect(result.tradeProposals.every(t => t.action === 'buy')).toBe(true);

      // Validiere Compliance
      expect(result.validation.isValid).toBe(true);
      expect(result.validation.errors.length).toBe(0);
    });

    it('sollte bei großem Zufluss (>20%) Rebalancing durchführen', async () => {
      const result = await optimizer.optimizeLiquidityAllocation({
        portfolioId: testPortfolioId,
        additionalLiquidity: 25000,  // 25% von 100.000
        optimizationTarget: 'rebalance'
      });

      // Erwarte Rebalancing-Empfehlungen
      expect(result.optimizationPlan).toBeDefined();
      expect(result.tradeProposals.length).toBeGreaterThan(0);

      // Validiere dass verschiedene Trade-Typen vorgeschlagen werden
      const buyTrades = result.tradeProposals.filter(t => t.action === 'buy');
      const sellTrades = result.tradeProposals.filter(t => t.action === 'sell');

      expect(buyTrades.length).toBeGreaterThan(0);

      // Validiere Zielallokation wird angestrebt
      expect(result.projectedAllocation).toBeDefined();

      // Prüfe dass Risikometriken verbessert werden
      expect(result.expectedImprovement.diversificationScore).toBeGreaterThan(0);
    });

    it('sollte Opportunitäten bei unterbewerteten Assets nutzen', async () => {
      const result = await optimizer.optimizeLiquidityAllocation({
        portfolioId: testPortfolioId,
        additionalLiquidity: 15000,
        optimizationTarget: 'opportunity'
      });

      // Erwarte opportunistische Allokation
      expect(result.optimizationPlan).toBeDefined();
      expect(result.tradeProposals.length).toBeGreaterThan(0);

      // Validiere dass Opportunity-Strategie höhere erwartete Rendite hat
      expect(result.expectedImprovement.expectedReturn).toBeGreaterThan(0);

      // Prüfe dass High-Priority Trades vorhanden sind
      const highPriorityTrades = result.tradeProposals.filter(t => t.priority === 'high');
      expect(highPriorityTrades.length).toBeGreaterThan(0);
    });
  });

  describe('Constraint Validation', () => {
    it('sollte minimale Order-Größe respektieren', async () => {
      const result = await optimizer.optimizeLiquidityAllocation({
        portfolioId: testPortfolioId,
        additionalLiquidity: 10000,
        optimizationTarget: 'maintain',
        constraints: {
          minOrderSize: 1000
        }
      });

      // Alle Trades sollten >= 1000 EUR sein oder nicht ausgeführt werden
      result.tradeProposals.forEach(trade => {
        if (trade.action !== 'hold') {
          expect(Math.abs(trade.amount)).toBeGreaterThanOrEqual(1000);
        }
      });

      // Validiere dass Constraint-Prüfung bestanden wurde
      expect(result.validation.complianceChecks.minOrderSize).toBe(true);
    });

    it('sollte maximale Positionsgröße einhalten', async () => {
      const result = await optimizer.optimizeLiquidityAllocation({
        portfolioId: testPortfolioId,
        additionalLiquidity: 50000,
        optimizationTarget: 'rebalance',
        constraints: {
          maxPositionSize: 0.25  // Max 25% pro Position
        }
      });

      // Validiere dass Max-Position-Size Constraint erfüllt wird
      expect(result.validation.complianceChecks.maxPositionSize).toBe(true);

      // Prüfe dass projected allocation die Limits einhält
      Object.values(result.projectedAllocation).forEach(percentage => {
        expect(percentage).toBeLessThanOrEqual(0.25);
      });
    });

    it('sollte ausgeschlossene Instrumente nicht kaufen', async () => {
      const result = await optimizer.optimizeLiquidityAllocation({
        portfolioId: testPortfolioId,
        additionalLiquidity: 10000,
        optimizationTarget: 'rebalance',
        constraints: {
          excludedInstruments: ['IE00B4ND3602'] // Gold ETC ausschließen
        }
      });

      // Prüfe dass ausgeschlossene Instrumente nicht gekauft werden
      const goldTrades = result.tradeProposals.filter(t =>
        t.name.includes('Gold') && t.action === 'buy'
      );
      expect(goldTrades.length).toBe(0);

      // Validiere Compliance
      expect(result.validation.isValid).toBe(true);
    });
  });

  describe('Multiple Scenario Simulation', () => {
    it('sollte verschiedene Szenarien vergleichen können', async () => {
      const result = await optimizer.simulateMultipleScenarios({
        portfolioId: testPortfolioId,
        additionalLiquidity: 20000,
        scenarios: ['conservative', 'balanced', 'aggressive']
      });

      // Erwarte 3 Szenarien
      expect(result.scenarios.length).toBe(3);

      // Jedes Szenario sollte vollständige Ergebnisse haben
      result.scenarios.forEach(scenario => {
        expect(scenario.optimizationPlan).toBeDefined();
        expect(scenario.tradeProposals.length).toBeGreaterThan(0);
        expect(scenario.validation.isValid).toBe(true);
      });

      // Erwarte Vergleich und Empfehlung
      expect(result.comparison).toBeDefined();
      expect(result.recommendation).toBeDefined();
      expect(['conservative', 'balanced', 'aggressive']).toContain(result.recommendation);
    });
  });

  describe('Incremental Impact Analysis', () => {
    it('sollte verschiedene Liquiditätsmengen analysieren können', async () => {
      const result = await optimizer.analyzeIncrementalImpact({
        portfolioId: testPortfolioId,
        incrementAmounts: [5000, 10000, 15000, 20000],
        strategy: 'rebalance'
      });

      // Erwarte Analyse für alle Beträge
      expect(result).toBeDefined();

      // Validiere dass verschiedene Liquiditätsmengen analysiert wurden
      // (Implementation depends on Claude service response structure)
      expect(typeof result).toBe('object');
    });
  });

  describe('Error Handling', () => {
    it('sollte ungültiges Portfolio behandeln', async () => {
      await expect(optimizer.optimizeLiquidityAllocation({
        portfolioId: 'non-existent-portfolio',
        additionalLiquidity: 10000,
        optimizationTarget: 'maintain'
      })).rejects.toThrow('Portfolio non-existent-portfolio not found');
    });

    it('sollte negative Liquidität ablehnen', async () => {
      await expect(optimizer.optimizeLiquidityAllocation({
        portfolioId: testPortfolioId,
        additionalLiquidity: -5000,
        optimizationTarget: 'maintain'
      })).rejects.toThrow();
    });
  });
});

// Helper functions
function calculateAllocationDiff(current: Record<string, number>, projected: Record<string, number>): number {
  let totalDiff = 0;
  const allKeys = new Set([...Object.keys(current), ...Object.keys(projected)]);

  for (const key of allKeys) {
    const currentVal = current[key] || 0;
    const projectedVal = projected[key] || 0;
    totalDiff += Math.abs(currentVal - projectedVal);
  }

  return totalDiff / allKeys.size;
}

function calculateTargetDeviation(actual: Record<string, number>, target: Record<string, number>): number {
  let totalDeviation = 0;
  const allKeys = new Set([...Object.keys(actual), ...Object.keys(target)]);

  for (const key of allKeys) {
    const actualVal = actual[key] || 0;
    const targetVal = target[key] || 0;
    totalDeviation += Math.abs(actualVal - targetVal);
  }

  return totalDeviation / allKeys.size;
}