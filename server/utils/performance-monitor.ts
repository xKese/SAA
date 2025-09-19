import { logger } from './logger';

// Ziel-Metriken für Liquiditäts-Optimierung
export const PERFORMANCE_TARGETS = {
  optimizationCalculation: 2000,  // <2s für Optimierung
  scenarioSimulation: 5000,       // <5s für 3 Szenarien
  tradeGeneration: 1000,           // <1s für Trade-Vorschläge
  totalWizardFlow: 15000,         // <15s für kompletten Wizard
  portfolioLoading: 500,          // <500ms für Portfolio-Laden
  validationCheck: 300,           // <300ms für Validierung
  claudeApiCall: 3000             // <3s für Claude API Call
};

// Performance Metrics Store
interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: string;
  portfolioId?: string;
  success: boolean;
  errorMessage?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 1000; // Behalte nur die letzten 1000 Metriken

  recordMetric(
    operation: string,
    duration: number,
    portfolioId?: string,
    success: boolean = true,
    errorMessage?: string
  ) {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: new Date().toISOString(),
      portfolioId,
      success,
      errorMessage
    };

    this.metrics.push(metric);

    // Behalte nur die neuesten Metriken
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Log Performance-Warnungen
    const target = PERFORMANCE_TARGETS[operation as keyof typeof PERFORMANCE_TARGETS];
    if (target && duration > target) {
      logger.warn(`Slow ${operation}: ${duration}ms (target: ${target}ms)`, {
        operation,
        duration,
        target,
        portfolioId,
        success,
        errorMessage
      });
    }

    // Log sehr langsame Operationen als Error
    if (target && duration > target * 2) {
      logger.error(`Very slow ${operation}: ${duration}ms (target: ${target}ms)`, {
        operation,
        duration,
        target,
        portfolioId,
        success,
        errorMessage
      });
    }
  }

  recordOptimizationDuration(path: string, duration: number, portfolioId?: string) {
    let operation = 'optimizationCalculation';

    if (path.includes('/simulate')) {
      operation = 'scenarioSimulation';
    } else if (path.includes('/execute')) {
      operation = 'tradeGeneration';
    }

    this.recordMetric(operation, duration, portfolioId);
  }

  getMetrics(operation?: string, portfolioId?: string): PerformanceMetric[] {
    let filteredMetrics = this.metrics;

    if (operation) {
      filteredMetrics = filteredMetrics.filter(m => m.operation === operation);
    }

    if (portfolioId) {
      filteredMetrics = filteredMetrics.filter(m => m.portfolioId === portfolioId);
    }

    return filteredMetrics.slice(-100); // Letzten 100 Ergebnisse
  }

  getAverageMetrics(operation: string, timeWindow: number = 3600000): {
    averageDuration: number;
    count: number;
    successRate: number;
    p95Duration: number;
  } {
    const cutoffTime = new Date(Date.now() - timeWindow);
    const metrics = this.metrics.filter(
      m => m.operation === operation && new Date(m.timestamp) >= cutoffTime
    );

    if (metrics.length === 0) {
      return { averageDuration: 0, count: 0, successRate: 0, p95Duration: 0 };
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const successCount = metrics.filter(m => m.success).length;

    return {
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      count: metrics.length,
      successRate: successCount / metrics.length,
      p95Duration: durations[Math.floor(durations.length * 0.95)] || 0
    };
  }

  getPerformanceReport(): {
    timestamp: string;
    operations: Record<string, {
      target: number;
      average: number;
      p95: number;
      count: number;
      successRate: number;
      status: 'good' | 'warning' | 'critical';
    }>;
    overallHealth: 'good' | 'warning' | 'critical';
  } {
    const report: any = {
      timestamp: new Date().toISOString(),
      operations: {},
      overallHealth: 'good' as const
    };

    let criticalCount = 0;
    let warningCount = 0;

    for (const [operation, target] of Object.entries(PERFORMANCE_TARGETS)) {
      const metrics = this.getAverageMetrics(operation);

      let status: 'good' | 'warning' | 'critical' = 'good';
      if (metrics.average > target * 2 || metrics.successRate < 0.9) {
        status = 'critical';
        criticalCount++;
      } else if (metrics.average > target * 1.5 || metrics.successRate < 0.95) {
        status = 'warning';
        warningCount++;
      }

      report.operations[operation] = {
        target,
        average: Math.round(metrics.average),
        p95: Math.round(metrics.p95Duration),
        count: metrics.count,
        successRate: Math.round(metrics.successRate * 100) / 100,
        status
      };
    }

    // Overall health assessment
    if (criticalCount > 0) {
      report.overallHealth = 'critical';
    } else if (warningCount > 2) {
      report.overallHealth = 'warning';
    }

    return report;
  }

  clearMetrics() {
    this.metrics = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Middleware für Performance-Monitoring
export const performanceMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now();
  const portfolioId = req.params.id;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const success = res.statusCode < 400;
    const errorMessage = success ? undefined : `HTTP ${res.statusCode}`;

    performanceMonitor.recordOptimizationDuration(
      req.path,
      duration,
      portfolioId
    );

    // Record specific operation if we can determine it
    if (req.path.includes('/optimize')) {
      performanceMonitor.recordMetric('optimizationCalculation', duration, portfolioId, success, errorMessage);
    } else if (req.path.includes('/simulate')) {
      performanceMonitor.recordMetric('scenarioSimulation', duration, portfolioId, success, errorMessage);
    } else if (req.path.includes('/execute')) {
      performanceMonitor.recordMetric('tradeGeneration', duration, portfolioId, success, errorMessage);
    }
  });

  next();
};

// Helper für Performance-Messungen in Services
export class PerformanceTimer {
  private start: number;
  private operation: string;
  private portfolioId?: string;

  constructor(operation: string, portfolioId?: string) {
    this.operation = operation;
    this.portfolioId = portfolioId;
    this.start = Date.now();
  }

  end(success: boolean = true, errorMessage?: string) {
    const duration = Date.now() - this.start;
    performanceMonitor.recordMetric(
      this.operation,
      duration,
      this.portfolioId,
      success,
      errorMessage
    );
    return duration;
  }
}

// Decorator für Performance-Monitoring
export function performanceTracker(operation: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const timer = new PerformanceTimer(operation, args[0]?.portfolioId);

      try {
        const result = await method.apply(this, args);
        timer.end(true);
        return result;
      } catch (error) {
        timer.end(false, error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
    };

    return descriptor;
  };
}