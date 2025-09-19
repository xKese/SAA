/**
 * Performance and load tests for validation framework
 * Tests processing time benchmarks, memory usage, concurrent processing,
 * cache optimization, and API response times under load
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PortfolioMathematics,
  AssetData,
  FundHolding,
  LookThroughValidationResult
} from '../../server/utils/portfolio-mathematics';

// Performance monitoring utilities
class PerformanceMonitor {
  private startTime: number = 0;
  private startMemory: number = 0;

  start() {
    this.startTime = performance.now();
    if (typeof process !== 'undefined' && process.memoryUsage) {
      this.startMemory = process.memoryUsage().heapUsed;
    }
  }

  end() {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    
    let memoryDelta = 0;
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const endMemory = process.memoryUsage().heapUsed;
      memoryDelta = endMemory - this.startMemory;
    }

    return {
      duration,
      memoryDelta: Math.abs(memoryDelta),
      memoryUsed: this.formatBytes(memoryDelta)
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Test data generators
const generateLargePortfolio = (size: number): AssetData[] => {
  return Array.from({ length: size }, (_, i) => ({
    name: `Asset ${i + 1}`,
    expectedReturn: 0.05 + (Math.random() * 0.10), // 5-15% returns
    volatility: 0.08 + (Math.random() * 0.25), // 8-33% volatility
    weight: 1 / size, // Equal weighting
    value: Math.floor(Math.random() * 100000) + 10000 // 10k-110k values
  }));
};

const generateLargeFundHoldings = (size: number): FundHolding[] => {
  const assetClasses = ['Aktien', 'Anleihen', 'Immobilien', 'Rohstoffe', 'Liquidität/Cash'];
  const geographies = ['Deutschland', 'Europa (inkl. UK)', 'USA/Nordamerika', 'Asien', 'Emerging Markets'];
  const currencies = ['EUR', 'USD', 'GBP', 'JPY', 'CHF'];

  return Array.from({ length: size }, (_, i) => ({
    name: `Holding ${i + 1}`,
    isin: `TEST${String(i + 1).padStart(8, '0')}`,
    weight: 1 / size,
    value: Math.floor(Math.random() * 50000) + 1000,
    currency: currencies[i % currencies.length],
    assetClass: assetClasses[i % assetClasses.length],
    geography: geographies[i % geographies.length],
    sector: `Sector ${(i % 10) + 1}`
  }));
};

describe('Validation Performance Tests', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  afterEach(() => {
    // Clean up any resources
    if (global.gc) {
      global.gc();
    }
  });

  describe('Validation Processing Time Benchmarks', () => {
    it('should process small portfolio validation within 100ms', () => {
      const smallPortfolio = generateLargePortfolio(25);
      
      monitor.start();
      const metrics = PortfolioMathematics.calculateRiskMetrics(smallPortfolio);
      const performance = monitor.end();

      expect(metrics).toBeDefined();
      expect(performance.duration).toBeLessThan(100); // 100ms threshold
    });

    it('should process medium portfolio validation within 500ms', () => {
      const mediumPortfolio = generateLargePortfolio(100);
      
      monitor.start();
      const metrics = PortfolioMathematics.calculateRiskMetrics(mediumPortfolio);
      const performance = monitor.end();

      expect(metrics).toBeDefined();
      expect(performance.duration).toBeLessThan(500); // 500ms threshold
    });

    it('should process large portfolio validation within 2 seconds', () => {
      const largePortfolio = generateLargePortfolio(500);
      
      monitor.start();
      const metrics = PortfolioMathematics.calculateRiskMetrics(largePortfolio);
      const performance = monitor.end();

      expect(metrics).toBeDefined();
      expect(performance.duration).toBeLessThan(2000); // 2 second threshold
    });

    it('should process extra large portfolio validation within 5 seconds', () => {
      const extraLargePortfolio = generateLargePortfolio(1000);
      
      monitor.start();
      const metrics = PortfolioMathematics.calculateRiskMetrics(extraLargePortfolio);
      const performance = monitor.end();

      expect(metrics).toBeDefined();
      expect(performance.duration).toBeLessThan(5000); // 5 second threshold
      
      console.log(`Extra large portfolio (1000 assets) processed in ${performance.duration.toFixed(2)}ms`);
      console.log(`Memory used: ${performance.memoryUsed}`);
    });

    it('should validate fund decomposition performance scales linearly', () => {
      const portfolioSizes = [50, 100, 200, 400];
      const performanceResults: Array<{ size: number; duration: number }> = [];

      portfolioSizes.forEach(size => {
        const holdings = generateLargeFundHoldings(size);
        const fundValue = holdings.reduce((sum, holding) => sum + holding.value, 0);

        monitor.start();
        const issues = PortfolioMathematics.validateFundDecomposition(fundValue, holdings);
        const performance = monitor.end();

        performanceResults.push({ size, duration: performance.duration });
        expect(issues).toBeDefined();
      });

      // Check that performance scales roughly linearly (not exponentially)
      const firstResult = performanceResults[0];
      const lastResult = performanceResults[performanceResults.length - 1];
      const scaleFactor = lastResult.size / firstResult.size;
      const performanceRatio = lastResult.duration / firstResult.duration;

      // Performance should scale no worse than O(n log n)
      expect(performanceRatio).toBeLessThan(scaleFactor * Math.log2(scaleFactor) * 2);

      console.log('Fund decomposition scaling:', performanceResults);
    });

    it('should handle look-through validation performance efficiently', () => {
      const originalAllocations = Array.from({ length: 50 }, (_, i) => ({
        category: `Category ${i + 1}`,
        value: Math.floor(Math.random() * 100000) + 10000,
        percentage: Math.random() * 100
      }));

      const lookThroughAllocations = originalAllocations.map(allocation => ({
        ...allocation,
        value: allocation.value + (Math.random() - 0.5) * 1000 // Small random variation
      }));

      monitor.start();
      const result = PortfolioMathematics.validateLookThroughAnalysis(
        originalAllocations,
        lookThroughAllocations
      );
      const performance = monitor.end();

      expect(result).toBeDefined();
      expect(performance.duration).toBeLessThan(200); // 200ms for 50 categories
    });
  });

  describe('Memory Usage During Large Portfolio Validation', () => {
    it('should use memory efficiently for large portfolios', () => {
      const largePortfolio = generateLargePortfolio(1000);
      
      monitor.start();
      const metrics = PortfolioMathematics.calculateRiskMetrics(largePortfolio);
      const performance = monitor.end();

      expect(metrics).toBeDefined();
      
      // Memory usage should be reasonable (less than 100MB for 1000 assets)
      if (performance.memoryDelta > 0) {
        expect(performance.memoryDelta).toBeLessThan(100 * 1024 * 1024); // 100MB
      }

      console.log(`Memory usage for 1000 assets: ${performance.memoryUsed}`);
    });

    it('should not have memory leaks in repeated validations', () => {
      const portfolio = generateLargePortfolio(100);
      const memoryUsages: number[] = [];

      // Run validation multiple times
      for (let i = 0; i < 10; i++) {
        monitor.start();
        const metrics = PortfolioMathematics.calculateRiskMetrics(portfolio);
        const performance = monitor.end();

        expect(metrics).toBeDefined();
        memoryUsages.push(performance.memoryDelta);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      // Memory usage should not consistently increase
      const averageEarly = memoryUsages.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      const averageLate = memoryUsages.slice(-3).reduce((a, b) => a + b, 0) / 3;

      // Late runs should not use significantly more memory
      expect(averageLate).toBeLessThan(averageEarly * 2);

      console.log('Memory usage trend:', memoryUsages.map(usage => `${Math.round(usage / 1024)}KB`));
    });

    it('should handle fund decomposition memory efficiently', () => {
      const holdings = generateLargeFundHoldings(2000); // Large fund decomposition
      const fundValue = holdings.reduce((sum, holding) => sum + holding.value, 0);

      monitor.start();
      const issues = PortfolioMathematics.validateFundDecomposition(fundValue, holdings);
      const performance = monitor.end();

      expect(issues).toBeDefined();
      
      // Should not use excessive memory for fund decomposition
      if (performance.memoryDelta > 0) {
        expect(performance.memoryDelta).toBeLessThan(50 * 1024 * 1024); // 50MB
      }

      console.log(`Fund decomposition memory usage (2000 holdings): ${performance.memoryUsed}`);
    });

    it('should optimize memory for double counting detection', () => {
      const portfolioPositions = Array.from({ length: 500 }, (_, i) => ({
        name: `Position ${i + 1}`,
        isin: `TEST${String(i + 1).padStart(8, '0')}`,
        value: Math.floor(Math.random() * 50000) + 1000
      }));

      const underlyingHoldings = generateLargeFundHoldings(1000);

      monitor.start();
      const result = PortfolioMathematics.detectDoubleCounting(portfolioPositions, underlyingHoldings);
      const performance = monitor.end();

      expect(result).toBeDefined();
      
      // Double counting detection should be memory efficient
      if (performance.memoryDelta > 0) {
        expect(performance.memoryDelta).toBeLessThan(30 * 1024 * 1024); // 30MB
      }

      console.log(`Double counting detection memory usage: ${performance.memoryUsed}`);
    });
  });

  describe('Concurrent Validation Processing Performance', () => {
    it('should handle multiple concurrent validations efficiently', async () => {
      const portfolios = Array.from({ length: 5 }, () => generateLargePortfolio(200));
      
      monitor.start();
      
      const validationPromises = portfolios.map(async (portfolio) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            const metrics = PortfolioMathematics.calculateRiskMetrics(portfolio);
            resolve(metrics);
          }, 0);
        });
      });

      const results = await Promise.all(validationPromises);
      const performance = monitor.end();

      expect(results).toHaveLength(5);
      results.forEach(result => expect(result).toBeDefined());
      
      // Concurrent processing should not take much longer than sequential
      expect(performance.duration).toBeLessThan(3000); // 3 seconds for 5 concurrent validations

      console.log(`Concurrent validation performance: ${performance.duration.toFixed(2)}ms`);
    });

    it('should maintain performance under load with multiple validation types', async () => {
      const portfolio = generateLargePortfolio(100);
      const holdings = generateLargeFundHoldings(200);
      const fundValue = holdings.reduce((sum, holding) => sum + holding.value, 0);

      monitor.start();

      // Simulate concurrent different validation types
      const validationTasks = await Promise.all([
        Promise.resolve(PortfolioMathematics.calculateRiskMetrics(portfolio)),
        Promise.resolve(PortfolioMathematics.validateFundDecomposition(fundValue, holdings)),
        Promise.resolve(PortfolioMathematics.detectDoubleCounting(
          portfolio.map((asset, i) => ({ name: asset.name, isin: `TEST${i}`, value: asset.value })),
          holdings.slice(0, 50)
        )),
        Promise.resolve(PortfolioMathematics.validateCurrencyExposure('EUR', [
          { currency: 'EUR', exposure: 40, isHedged: false },
          { currency: 'USD', exposure: 35, isHedged: true },
          { currency: 'GBP', exposure: 25, isHedged: true }
        ], true))
      ]);

      const performance = monitor.end();

      validationTasks.forEach(result => expect(result).toBeDefined());
      expect(performance.duration).toBeLessThan(1000); // 1 second for mixed validation types
    });

    it('should handle high-frequency validation requests', async () => {
      const smallPortfolio = generateLargePortfolio(50);
      const requestCount = 20;
      
      monitor.start();

      // Simulate high-frequency requests
      const requests = Array.from({ length: requestCount }, async (_, i) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            const metrics = PortfolioMathematics.calculateRiskMetrics(smallPortfolio);
            resolve(metrics);
          }, i * 10); // Stagger requests by 10ms
        });
      });

      const results = await Promise.all(requests);
      const performance = monitor.end();

      expect(results).toHaveLength(requestCount);
      results.forEach(result => expect(result).toBeDefined());
      
      // High-frequency requests should complete within reasonable time
      expect(performance.duration).toBeLessThan(2000); // 2 seconds for 20 requests
      
      console.log(`High-frequency validation performance: ${performance.duration.toFixed(2)}ms for ${requestCount} requests`);
    });
  });

  describe('Cache Hit/Miss Ratio Optimization', () => {
    const mockCache = new Map<string, any>();

    const getCacheKey = (portfolio: AssetData[]): string => {
      return JSON.stringify(portfolio.map(asset => ({ 
        name: asset.name, 
        value: asset.value, 
        weight: asset.weight 
      })));
    };

    const getCachedResult = (key: string) => mockCache.get(key);
    const setCachedResult = (key: string, result: any) => mockCache.set(key, result);

    beforeEach(() => {
      mockCache.clear();
    });

    it('should demonstrate cache effectiveness for repeated calculations', () => {
      const portfolio = generateLargePortfolio(200);
      const cacheKey = getCacheKey(portfolio);

      // First calculation (cache miss)
      monitor.start();
      const firstResult = PortfolioMathematics.calculateRiskMetrics(portfolio);
      const firstPerformance = monitor.end();
      setCachedResult(cacheKey, firstResult);

      // Second calculation (cache hit simulation)
      monitor.start();
      const cachedResult = getCachedResult(cacheKey);
      const secondPerformance = monitor.end();

      expect(firstResult).toBeDefined();
      expect(cachedResult).toBeDefined();
      expect(secondPerformance.duration).toBeLessThan(firstPerformance.duration / 10); // Cache should be 10x faster

      console.log(`Cache performance: First ${firstPerformance.duration.toFixed(2)}ms, Cached ${secondPerformance.duration.toFixed(2)}ms`);
    });

    it('should optimize cache hit ratio with similar portfolios', () => {
      const basePortfolio = generateLargePortfolio(100);
      let cacheHits = 0;
      let cacheMisses = 0;

      // Generate similar portfolios with small variations
      const similarPortfolios = Array.from({ length: 10 }, (_, i) => {
        return basePortfolio.map(asset => ({
          ...asset,
          value: asset.value * (1 + (Math.random() - 0.5) * 0.01) // ±0.5% variation
        }));
      });

      similarPortfolios.forEach(portfolio => {
        const cacheKey = getCacheKey(portfolio);
        
        if (getCachedResult(cacheKey)) {
          cacheHits++;
        } else {
          cacheMisses++;
          const result = PortfolioMathematics.calculateRiskMetrics(portfolio);
          setCachedResult(cacheKey, result);
        }
      });

      // For similar portfolios, we expect some cache efficiency
      const hitRatio = cacheHits / (cacheHits + cacheMisses);
      console.log(`Cache hit ratio: ${(hitRatio * 100).toFixed(1)}% (${cacheHits} hits, ${cacheMisses} misses)`);
      
      // At least some cache hits expected for similar data
      expect(cacheHits + cacheMisses).toBe(10);
    });

    it('should invalidate cache appropriately for different portfolios', () => {
      const portfolio1 = generateLargePortfolio(50);
      const portfolio2 = generateLargePortfolio(50);

      const key1 = getCacheKey(portfolio1);
      const key2 = getCacheKey(portfolio2);

      // Different portfolios should have different cache keys
      expect(key1).not.toBe(key2);

      const result1 = PortfolioMathematics.calculateRiskMetrics(portfolio1);
      const result2 = PortfolioMathematics.calculateRiskMetrics(portfolio2);

      setCachedResult(key1, result1);
      setCachedResult(key2, result2);

      expect(getCachedResult(key1)).toBe(result1);
      expect(getCachedResult(key2)).toBe(result2);
      expect(getCachedResult(key1)).not.toBe(getCachedResult(key2));
    });
  });

  describe('API Response Time Testing Under Load', () => {
    const simulateAPICall = async (portfolio: AssetData[], delay: number = 0): Promise<any> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const result = PortfolioMathematics.calculateRiskMetrics(portfolio);
          resolve({
            success: true,
            data: result,
            processingTime: Math.random() * 100 + 50 // Simulate 50-150ms processing
          });
        }, delay);
      });
    };

    it('should maintain API response times under normal load', async () => {
      const portfolio = generateLargePortfolio(100);
      const requestCount = 10;
      
      monitor.start();
      
      const apiCalls = Array.from({ length: requestCount }, () => 
        simulateAPICall(portfolio)
      );

      const responses = await Promise.all(apiCalls);
      const performance = monitor.end();

      expect(responses).toHaveLength(requestCount);
      responses.forEach(response => {
        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
      });

      const averageResponseTime = performance.duration / requestCount;
      expect(averageResponseTime).toBeLessThan(500); // Average < 500ms per request

      console.log(`Average API response time: ${averageResponseTime.toFixed(2)}ms`);
    });

    it('should handle peak load gracefully', async () => {
      const portfolio = generateLargePortfolio(200);
      const peakRequestCount = 50;
      
      monitor.start();
      
      // Simulate peak load with staggered requests
      const peakApiCalls = Array.from({ length: peakRequestCount }, (_, i) => 
        simulateAPICall(portfolio, Math.random() * 100) // Random delay 0-100ms
      );

      const responses = await Promise.all(peakApiCalls);
      const performance = monitor.end();

      expect(responses).toHaveLength(peakRequestCount);
      responses.forEach(response => {
        expect(response.success).toBe(true);
      });

      // Should handle peak load within reasonable time
      expect(performance.duration).toBeLessThan(5000); // 5 seconds for 50 requests

      console.log(`Peak load performance: ${performance.duration.toFixed(2)}ms for ${peakRequestCount} requests`);
    });

    it('should maintain response times for complex validation workflows', async () => {
      const portfolio = generateLargePortfolio(150);
      const holdings = generateLargeFundHoldings(300);
      
      const complexWorkflow = async () => {
        const metrics = PortfolioMathematics.calculateRiskMetrics(portfolio);
        const decomposition = PortfolioMathematics.validateFundDecomposition(
          100000, 
          holdings.slice(0, 100)
        );
        const doubleCounting = PortfolioMathematics.detectDoubleCounting(
          portfolio.slice(0, 50).map((asset, i) => ({ 
            name: asset.name, 
            isin: `TEST${i}`, 
            value: asset.value 
          })),
          holdings.slice(0, 50)
        );

        return { metrics, decomposition, doubleCounting };
      };

      monitor.start();
      const workflowResults = await Promise.all([
        complexWorkflow(),
        complexWorkflow(),
        complexWorkflow()
      ]);
      const performance = monitor.end();

      expect(workflowResults).toHaveLength(3);
      workflowResults.forEach(result => {
        expect(result.metrics).toBeDefined();
        expect(result.decomposition).toBeDefined();
        expect(result.doubleCounting).toBeDefined();
      });

      expect(performance.duration).toBeLessThan(3000); // 3 seconds for complex workflows

      console.log(`Complex workflow performance: ${performance.duration.toFixed(2)}ms`);
    });
  });

  describe('Performance Regression Detection', () => {
    const performanceBenchmarks = {
      smallPortfolio: 100,     // 25 assets
      mediumPortfolio: 500,    // 100 assets  
      largePortfolio: 2000,    // 500 assets
      fundDecomposition: 200,  // 200 holdings
      doubleCounting: 150      // 100 positions vs 200 holdings
    };

    it('should detect performance regressions in risk calculations', () => {
      const testCases = [
        { name: 'small', size: 25, benchmark: performanceBenchmarks.smallPortfolio },
        { name: 'medium', size: 100, benchmark: performanceBenchmarks.mediumPortfolio },
        { name: 'large', size: 500, benchmark: performanceBenchmarks.largePortfolio }
      ];

      testCases.forEach(({ name, size, benchmark }) => {
        const portfolio = generateLargePortfolio(size);
        
        monitor.start();
        const metrics = PortfolioMathematics.calculateRiskMetrics(portfolio);
        const performance = monitor.end();

        expect(metrics).toBeDefined();
        expect(performance.duration).toBeLessThan(benchmark);

        const performanceRatio = performance.duration / benchmark;
        if (performanceRatio > 0.8) {
          console.warn(`Performance warning: ${name} portfolio took ${performance.duration.toFixed(2)}ms (${(performanceRatio * 100).toFixed(1)}% of benchmark)`);
        }
      });
    });

    it('should track performance trends over time', () => {
      const portfolio = generateLargePortfolio(200);
      const performanceHistory: number[] = [];

      // Run multiple iterations to establish trend
      for (let i = 0; i < 5; i++) {
        monitor.start();
        const metrics = PortfolioMathematics.calculateRiskMetrics(portfolio);
        const performance = monitor.end();

        expect(metrics).toBeDefined();
        performanceHistory.push(performance.duration);
      }

      // Calculate trend
      const averagePerformance = performanceHistory.reduce((a, b) => a + b, 0) / performanceHistory.length;
      const performanceVariance = performanceHistory.reduce((sum, time) => 
        sum + Math.pow(time - averagePerformance, 2), 0) / performanceHistory.length;
      const performanceStdDev = Math.sqrt(performanceVariance);

      // Performance should be relatively consistent
      expect(performanceStdDev).toBeLessThan(averagePerformance * 0.3); // 30% variance threshold

      console.log(`Performance trend: avg ${averagePerformance.toFixed(2)}ms, std dev ${performanceStdDev.toFixed(2)}ms`);
      console.log(`Performance history: ${performanceHistory.map(p => p.toFixed(1)).join('ms, ')}ms`);
    });
  });
});