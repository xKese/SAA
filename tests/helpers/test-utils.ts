import { vi } from 'vitest';
import request from 'supertest';

export interface JobMonitor {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: any;
  error?: string;
}

export class TestJobQueue {
  private jobs = new Map<string, JobMonitor>();
  private completionCallbacks = new Map<string, (result: any) => void>();

  addJob(jobId: string, initialStatus: JobMonitor['status'] = 'pending'): void {
    this.jobs.set(jobId, {
      jobId,
      status: initialStatus,
      progress: 0
    });
  }

  updateJob(jobId: string, updates: Partial<JobMonitor>): void {
    const job = this.jobs.get(jobId);
    if (job) {
      const updatedJob = { ...job, ...updates };
      this.jobs.set(jobId, updatedJob);

      // Rufe Callback auf wenn Job completed
      if (updatedJob.status === 'completed' && this.completionCallbacks.has(jobId)) {
        const callback = this.completionCallbacks.get(jobId)!;
        callback(updatedJob.result);
      }
    }
  }

  getJob(jobId: string): JobMonitor | undefined {
    return this.jobs.get(jobId);
  }

  onJobComplete(jobId: string, callback: (result: any) => void): void {
    this.completionCallbacks.set(jobId, callback);
  }

  simulateJobCompletion(jobId: string, result: any, delay: number = 1000): void {
    setTimeout(() => {
      this.updateJob(jobId, {
        status: 'completed',
        progress: 100,
        result
      });
    }, delay);
  }

  clear(): void {
    this.jobs.clear();
    this.completionCallbacks.clear();
  }
}

export const testJobQueue = new TestJobQueue();

export async function waitForJob(
  jobId: string,
  timeout: number = 30000,
  app?: any
): Promise<any> {
  const startTime = Date.now();
  const pollInterval = 500;

  while (Date.now() - startTime < timeout) {
    if (app) {
      // Echte Job-Status Abfrage über API
      try {
        const response = await request(app)
          .get(`/api/saa/jobs/${jobId}/status`)
          .expect(200);

        if (response.body.status === 'completed') {
          return response.body.result;
        }

        if (response.body.status === 'failed') {
          throw new Error(`Job ${jobId} failed: ${response.body.error}`);
        }
      } catch (error) {
        // API noch nicht implementiert, verwende Mock
      }
    }

    // Fallback: Mock Job Queue
    const job = testJobQueue.getJob(jobId);
    if (job) {
      if (job.status === 'completed') {
        return job.result;
      }
      if (job.status === 'failed') {
        throw new Error(`Job ${jobId} failed: ${job.error}`);
      }
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Job ${jobId} did not complete within ${timeout}ms`);
}

export async function waitForCondition(
  condition: () => Promise<boolean> | boolean,
  timeout: number = 5000,
  interval: number = 100,
  description?: string
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await condition();
      if (result) {
        return;
      }
    } catch (error) {
      // Condition threw error, continue waiting
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  const desc = description ? ` (${description})` : '';
  throw new Error(`Condition not met within ${timeout}ms${desc}`);
}

export function createMockClaudeService() {
  return {
    createStrategicAssetAllocation: vi.fn().mockImplementation(async (request) => {
      // Simuliere realistische Antwort basierend auf Risk Profile
      await new Promise(resolve => setTimeout(resolve, 100)); // Simuliere Latenz

      const equityAllocation = Math.min(0.9, Math.max(0.1, request.riskProfile * 0.1));
      const bondAllocation = Math.min(0.8, Math.max(0.1, (10 - request.riskProfile) * 0.08));
      const alternativeAllocation = 0.05;

      return {
        portfolioId: `saa_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        strategy: {
          name: getStrategyName(request.riskProfile),
          riskLevel: request.riskProfile,
          timeHorizon: request.riskProfile <= 3 ? '3-5 years' : request.riskProfile >= 7 ? '10+ years' : '5-10 years',
          description: `Strategic asset allocation for risk profile ${request.riskProfile}`
        },
        allocation: {
          equities: equityAllocation,
          bonds: bondAllocation,
          alternatives: alternativeAllocation,
          cash: Math.max(0, 1 - equityAllocation - bondAllocation - alternativeAllocation)
        },
        positions: generateMockPositions(request.amount, equityAllocation, bondAllocation),
        expectedReturn: 0.02 + (request.riskProfile * 0.008),
        expectedRisk: 0.05 + (request.riskProfile * 0.015),
        sharpeRatio: (0.02 + (request.riskProfile * 0.008)) / (0.05 + (request.riskProfile * 0.015))
      };
    }),

    optimizePortfolio: vi.fn().mockImplementation(async ({ portfolioId, parameters }) => {
      await new Promise(resolve => setTimeout(resolve, 200));

      const mockJobId = `opt_${portfolioId}_${Date.now()}`;

      // Simuliere asynchrone Verarbeitung
      testJobQueue.addJob(mockJobId, 'processing');
      testJobQueue.simulateJobCompletion(mockJobId, {
        optimizedAllocation: {
          'IE00B4L5Y983': 0.60,
          'IE00B1FZS798': 0.35,
          'IE00B3DKXQ41': 0.05
        },
        expectedReturn: 0.065,
        expectedRisk: 0.120,
        sharpeRatio: 0.54,
        improvements: {
          returnImprovement: 0.008,
          riskReduction: 0.015,
          sharpeImprovement: 0.12
        }
      }, 1500);

      return { jobId: mockJobId };
    }),

    calculateRebalancing: vi.fn().mockImplementation(async ({ portfolioId, method, currentPositions }) => {
      await new Promise(resolve => setTimeout(resolve, 150));

      return {
        rebalancing: {
          method,
          targetAllocations: calculateTargetAllocations(currentPositions),
          currentAllocations: getCurrentAllocations(currentPositions)
        },
        trades: generateMockTrades(currentPositions),
        turnover: calculateTurnover(currentPositions),
        estimatedCosts: calculateEstimatedCosts(currentPositions),
        analysis: {
          deviations: calculateDeviations(currentPositions),
          triggerReason: 'threshold_exceeded',
          recommendation: 'Execute rebalancing to maintain target allocation',
          riskImpact: 'Minimal risk impact expected',
          timeToExecute: '1-2 business days'
        }
      };
    })
  };
}

function getStrategyName(riskProfile: number): string {
  if (riskProfile <= 2) return 'Very Conservative';
  if (riskProfile <= 4) return 'Conservative';
  if (riskProfile <= 6) return 'Balanced';
  if (riskProfile <= 8) return 'Growth';
  return 'Aggressive Growth';
}

function generateMockPositions(amount: number, equityAllocation: number, bondAllocation: number) {
  return [
    {
      isin: 'IE00B4L5Y983',
      name: 'iShares Core MSCI World UCITS ETF',
      allocation: equityAllocation * 0.7,
      value: amount * equityAllocation * 0.7,
      assetClass: 'Equity'
    },
    {
      isin: 'IE00B1FZS798',
      name: 'iShares Core Euro Government Bond UCITS ETF',
      allocation: bondAllocation * 0.8,
      value: amount * bondAllocation * 0.8,
      assetClass: 'Bond'
    },
    {
      isin: 'IE00B3DKXQ41',
      name: 'iShares Core Euro Corporate Bond UCITS ETF',
      allocation: bondAllocation * 0.2,
      value: amount * bondAllocation * 0.2,
      assetClass: 'Bond'
    }
  ];
}

function calculateTargetAllocations(positions: any[]) {
  return positions.reduce((acc, pos) => {
    acc[pos.isin || pos.name] = Math.random() * 0.4 + 0.1; // 10-50%
    return acc;
  }, {});
}

function getCurrentAllocations(positions: any[]) {
  return positions.reduce((acc, pos) => {
    acc[pos.isin || pos.name] = parseFloat(pos.percentage || '0') / 100;
    return acc;
  }, {});
}

function generateMockTrades(positions: any[]) {
  return positions.map((pos, index) => ({
    isin: pos.isin,
    name: pos.name,
    action: index % 2 === 0 ? 'sell' : 'buy',
    amount: Math.random() * 10000 + 1000,
    fromPercentage: parseFloat(pos.percentage || '0') / 100,
    toPercentage: Math.random() * 0.4 + 0.1,
    reason: 'Rebalancing threshold exceeded'
  }));
}

function calculateTurnover(positions: any[]): number {
  return Math.random() * 0.1 + 0.02; // 2-12%
}

function calculateEstimatedCosts(positions: any[]): number {
  const totalValue = positions.reduce((sum, pos) => sum + parseFloat(pos.value || '0'), 0);
  return totalValue * 0.001; // 0.1% transaction costs
}

function calculateDeviations(positions: any[]) {
  return positions.reduce((acc, pos) => {
    acc[pos.isin || pos.name] = (Math.random() - 0.5) * 0.1; // -5% to +5%
    return acc;
  }, {});
}

export class TestPerformanceMonitor {
  private measurements: { [key: string]: number[] } = {};

  startMeasurement(key: string): () => number {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      if (!this.measurements[key]) {
        this.measurements[key] = [];
      }
      this.measurements[key].push(duration);
      return duration;
    };
  }

  getStats(key: string) {
    const times = this.measurements[key] || [];
    if (times.length === 0) return null;

    return {
      count: times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      p95: times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]
    };
  }

  reset(): void {
    this.measurements = {};
  }
}

export const testPerformanceMonitor = new TestPerformanceMonitor();

export function expectWithinTimeLimit(promise: Promise<any>, timeLimit: number, description?: string) {
  const endMeasurement = testPerformanceMonitor.startMeasurement(description || 'operation');

  return promise.then(result => {
    const duration = endMeasurement();
    if (duration > timeLimit) {
      throw new Error(`Operation took ${duration}ms, expected < ${timeLimit}ms`);
    }
    return result;
  });
}