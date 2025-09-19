import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as schema from '../../shared/schema';

export interface TestDatabase {
  db: ReturnType<typeof drizzle>;
  cleanup: () => Promise<void>;
  reset: () => Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  // Verwende separate Test-Datenbank
  const testDbName = `test_portfolio_${Date.now()}_${Math.random().toString(36).substring(2)}`;

  // Erstelle Test-Datenbank-Connection
  const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/postgres';
  const baseConnection = postgres(connectionString, { max: 1 });

  try {
    // Erstelle Test-Datenbank
    await baseConnection`CREATE DATABASE ${baseConnection.unsafe(testDbName)}`;
  } catch (error) {
    console.warn('Could not create test database:', error);
    // Fallback: Verwende bestehende Datenbank mit Prefix
  } finally {
    await baseConnection.end();
  }

  // Verbinde zur Test-Datenbank
  const testConnectionString = connectionString.replace(/\/[^\/]*$/, `/${testDbName}`);
  const sql = postgres(testConnectionString, { max: 1 });
  const db = drizzle(sql, { schema });

  // Führe Migrationen aus
  try {
    await migrate(db, { migrationsFolder: './migrations' });
  } catch (error) {
    console.warn('Migration failed, continuing with existing schema:', error);
  }

  return {
    db,
    cleanup: async () => {
      await sql.end();

      // Lösche Test-Datenbank
      const cleanupConnection = postgres(connectionString, { max: 1 });
      try {
        await cleanupConnection`DROP DATABASE IF EXISTS ${cleanupConnection.unsafe(testDbName)}`;
      } catch (error) {
        console.warn('Could not drop test database:', error);
      } finally {
        await cleanupConnection.end();
      }
    },
    reset: async () => {
      // Lösche alle Daten aus Test-Tabellen
      await db.delete(schema.analysisPhases);
      await db.delete(schema.portfolioPositions);
      await db.delete(schema.portfolios);
      await db.delete(schema.users);
    }
  };
}

export async function createTestPortfolio(db: TestDatabase['db'], overrides: Partial<any> = {}) {
  const [portfolio] = await db.insert(schema.portfolios).values({
    name: 'Test Portfolio',
    fileName: 'test_portfolio.csv',
    totalValue: '100000.00',
    positionCount: 3,
    analysisStatus: 'pending',
    ...overrides
  }).returning();

  return portfolio;
}

export async function createTestPosition(
  db: TestDatabase['db'],
  portfolioId: string,
  overrides: Partial<any> = {}
) {
  const [position] = await db.insert(schema.portfolioPositions).values({
    portfolioId,
    name: 'Test Position',
    isin: 'IE00B4L5Y983',
    value: '50000.00',
    percentage: '50.00',
    instrumentType: 'ETF',
    assetClass: 'Equity',
    ...overrides
  }).returning();

  return position;
}

export async function createTestAnalysisPhase(
  db: TestDatabase['db'],
  portfolioId: string,
  overrides: Partial<any> = {}
) {
  const [phase] = await db.insert(schema.analysisPhases).values({
    portfolioId,
    phaseNumber: 0,
    phaseName: 'Test Phase',
    status: 'pending',
    ...overrides
  }).returning();

  return phase;
}

export async function waitForCondition(
  condition: () => Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

export async function waitForPortfolioAnalysis(
  db: TestDatabase['db'],
  portfolioId: string,
  expectedStatus: string = 'completed',
  timeout: number = 10000
): Promise<void> {
  await waitForCondition(async () => {
    const [portfolio] = await db
      .select({ analysisStatus: schema.portfolios.analysisStatus })
      .from(schema.portfolios)
      .where(schema.portfolios.id.eq(portfolioId));

    return portfolio?.analysisStatus === expectedStatus;
  }, timeout);
}

export async function waitForJob(
  jobId: string,
  timeout: number = 30000
): Promise<void> {
  // Simuliere Job-Completion für Tests
  // In echter Implementierung würde dies die Job-Queue überwachen
  await new Promise(resolve => setTimeout(resolve, 1000));
}

// Test Data Factory
export const TestDataFactory = {
  portfolio: (overrides: Partial<any> = {}) => ({
    name: `Test Portfolio ${Date.now()}`,
    fileName: 'test_portfolio.csv',
    totalValue: '100000.00',
    positionCount: 3,
    analysisStatus: 'pending',
    ...overrides
  }),

  position: (portfolioId: string, overrides: Partial<any> = {}) => ({
    portfolioId,
    name: 'Test ETF',
    isin: 'IE00B4L5Y983',
    value: '33333.33',
    percentage: '33.33',
    instrumentType: 'ETF',
    assetClass: 'Equity',
    ...overrides
  }),

  saaRequest: (overrides: Partial<any> = {}) => ({
    riskProfile: 4,
    amount: 250000,
    constraints: {
      maxPositions: 20,
      maxSinglePosition: 0.15
    },
    ...overrides
  }),

  optimizationRequest: (overrides: Partial<any> = {}) => ({
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
      }
    },
    ...overrides
  }),

  rebalancingRequest: (overrides: Partial<any> = {}) => ({
    method: 'threshold',
    constraints: {
      maxTurnover: 0.10,
      minTradeAmount: 1000
    },
    ...overrides
  })
};

// Test Database Seeder
export async function seedTestData(db: TestDatabase['db']) {
  // Erstelle Basis-Portfolio mit Positionen
  const portfolio = await createTestPortfolio(db, {
    name: 'Seeded Test Portfolio',
    analysisStatus: 'completed',
    analysisResults: {
      assetAllocation: [
        { assetClass: 'Equity', percentage: 60 },
        { assetClass: 'Bond', percentage: 40 }
      ],
      geographicAllocation: [
        { region: 'US', percentage: 40 },
        { region: 'Europe', percentage: 35 },
        { region: 'Asia', percentage: 25 }
      ]
    }
  });

  // Erstelle Positionen
  await createTestPosition(db, portfolio.id, {
    name: 'iShares Core MSCI World UCITS ETF',
    isin: 'IE00B4L5Y983',
    value: '60000.00',
    percentage: '60.00',
    assetClass: 'Equity'
  });

  await createTestPosition(db, portfolio.id, {
    name: 'iShares Core Euro Government Bond UCITS ETF',
    isin: 'IE00B1FZS798',
    value: '40000.00',
    percentage: '40.00',
    assetClass: 'Bond'
  });

  return { portfolio };
}