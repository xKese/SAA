import { Express, Request, Response } from "express";
import { performanceMonitor } from "../utils/performance-monitor";

export function setupPerformanceRoutes(app: Express) {
  // Performance-Dashboard Endpoint
  app.get('/api/performance/dashboard', (req: Request, res: Response) => {
    try {
      const report = performanceMonitor.getPerformanceReport();

      res.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Performance dashboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate performance report',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Spezifische Performance-Metriken
  app.get('/api/performance/metrics/:operation', (req: Request, res: Response) => {
    try {
      const { operation } = req.params;
      const { portfolioId } = req.query;

      const metrics = performanceMonitor.getMetrics(
        operation,
        portfolioId as string
      );

      const averageMetrics = performanceMonitor.getAverageMetrics(operation);

      res.json({
        success: true,
        data: {
          operation,
          portfolioId: portfolioId || null,
          recentMetrics: metrics,
          averages: averageMetrics
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Performance metrics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve performance metrics',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Performance-Zusammenfassung für spezifisches Portfolio
  app.get('/api/performance/portfolio/:id', (req: Request, res: Response) => {
    try {
      const { id: portfolioId } = req.params;

      const operations = [
        'optimizationCalculation',
        'scenarioSimulation',
        'tradeGeneration',
        'portfolioLoading',
        'validationCheck'
      ];

      const portfolioMetrics = operations.reduce((acc, operation) => {
        const metrics = performanceMonitor.getMetrics(operation, portfolioId);
        const averages = performanceMonitor.getAverageMetrics(operation);

        acc[operation] = {
          recentCount: metrics.length,
          averageDuration: averages.averageDuration,
          successRate: averages.successRate,
          p95Duration: averages.p95Duration
        };

        return acc;
      }, {} as Record<string, any>);

      res.json({
        success: true,
        data: {
          portfolioId,
          operations: portfolioMetrics,
          summary: {
            totalOperations: Object.values(portfolioMetrics).reduce(
              (sum: number, op: any) => sum + op.recentCount, 0
            ),
            overallSuccessRate: Object.values(portfolioMetrics).reduce(
              (sum: number, op: any) => sum + op.successRate, 0
            ) / operations.length
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Portfolio performance error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve portfolio performance',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Performance-Metriken zurücksetzen (nur für Development)
  app.delete('/api/performance/metrics', (req: Request, res: Response) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          error: 'Metrics reset not allowed in production'
        });
      }

      performanceMonitor.clearMetrics();

      res.json({
        success: true,
        message: 'Performance metrics cleared',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Performance reset error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear performance metrics',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Health Check mit Performance-Status
  app.get('/api/performance/health', (req: Request, res: Response) => {
    try {
      const report = performanceMonitor.getPerformanceReport();

      const healthStatus = {
        status: report.overallHealth,
        timestamp: report.timestamp,
        criticalOperations: Object.entries(report.operations)
          .filter(([_, metrics]) => metrics.status === 'critical')
          .map(([operation, metrics]) => ({
            operation,
            averageDuration: metrics.average,
            target: metrics.target,
            successRate: metrics.successRate
          })),
        warningOperations: Object.entries(report.operations)
          .filter(([_, metrics]) => metrics.status === 'warning')
          .map(([operation, metrics]) => ({
            operation,
            averageDuration: metrics.average,
            target: metrics.target,
            successRate: metrics.successRate
          }))
      };

      const statusCode = report.overallHealth === 'critical' ? 503
                      : report.overallHealth === 'warning' ? 200
                      : 200;

      res.status(statusCode).json({
        success: true,
        data: healthStatus
      });
    } catch (error) {
      console.error('Performance health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform health check',
        timestamp: new Date().toISOString()
      });
    }
  });
}