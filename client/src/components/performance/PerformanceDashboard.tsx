import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Zap,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from 'lucide-react';

interface PerformanceData {
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
}

export function PerformanceDashboard() {
  const [selectedOperation, setSelectedOperation] = useState<string>('optimizationCalculation');

  const { data: performanceData, isLoading, refetch } = useQuery({
    queryKey: ['performance-dashboard'],
    queryFn: async (): Promise<PerformanceData> => {
      const response = await fetch('/api/performance/dashboard');
      if (!response.ok) throw new Error('Failed to fetch performance data');
      const result = await response.json();
      return result.data;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <XCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  const getPerformancePercentage = (average: number, target: number) => {
    const performance = Math.max(0, Math.min(100, ((target - average) / target) * 100));
    return Math.round(performance);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Lade Performance-Daten...</span>
      </div>
    );
  }

  if (!performanceData) {
    return (
      <div className="p-8 text-center text-gray-500">
        Keine Performance-Daten verfügbar
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Health Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Performance Status
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(performanceData.overallHealth)}>
              {getStatusIcon(performanceData.overallHealth)}
              {performanceData.overallHealth.toUpperCase()}
            </Badge>
            <button
              onClick={() => refetch()}
              className="p-1 hover:bg-gray-100 rounded"
              title="Aktualisieren"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Letzte Aktualisierung: {new Date(performanceData.timestamp).toLocaleTimeString('de-DE')}
          </p>
        </CardContent>
      </Card>

      {/* Operations Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(performanceData.operations).map(([operation, metrics]) => (
          <Card
            key={operation}
            className={`cursor-pointer transition-colors ${
              selectedOperation === operation ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedOperation(operation)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {operation === 'optimizationCalculation' ? 'Optimierung' :
                   operation === 'scenarioSimulation' ? 'Szenarien' :
                   operation === 'tradeGeneration' ? 'Trade-Generierung' :
                   operation === 'portfolioLoading' ? 'Portfolio-Laden' :
                   operation === 'validationCheck' ? 'Validierung' :
                   operation}
                </CardTitle>
                <Badge className={getStatusColor(metrics.status)}>
                  {getStatusIcon(metrics.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Durchschnitt:</span>
                <span className="font-medium">{formatDuration(metrics.average)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Ziel:</span>
                <span className="font-medium">{formatDuration(metrics.target)}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Performance:</span>
                  <span className={`font-medium ${
                    metrics.average <= metrics.target ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {getPerformancePercentage(metrics.average, metrics.target)}%
                  </span>
                </div>
                <Progress
                  value={getPerformancePercentage(metrics.average, metrics.target)}
                  className="h-2"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Erfolgsrate:</span>
                <span className={`font-medium ${
                  metrics.successRate >= 0.95 ? 'text-green-600' :
                  metrics.successRate >= 0.90 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {formatPercentage(metrics.successRate)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Anzahl:</span>
                <span className="font-medium">{metrics.count}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed View */}
      <Tabs value="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Performance Details - {
                  selectedOperation === 'optimizationCalculation' ? 'Optimierung' :
                  selectedOperation === 'scenarioSimulation' ? 'Szenarien' :
                  selectedOperation === 'tradeGeneration' ? 'Trade-Generierung' :
                  selectedOperation === 'portfolioLoading' ? 'Portfolio-Laden' :
                  selectedOperation === 'validationCheck' ? 'Validierung' :
                  selectedOperation
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {performanceData.operations[selectedOperation] && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Timing-Metriken</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Durchschnittliche Dauer:</span>
                        <span className="font-medium">
                          {formatDuration(performanceData.operations[selectedOperation].average)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">95. Perzentil:</span>
                        <span className="font-medium">
                          {formatDuration(performanceData.operations[selectedOperation].p95)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ziel:</span>
                        <span className="font-medium">
                          {formatDuration(performanceData.operations[selectedOperation].target)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Performance vs. Ziel:</span>
                        <span className={`font-medium flex items-center gap-1 ${
                          performanceData.operations[selectedOperation].average <=
                          performanceData.operations[selectedOperation].target
                            ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {performanceData.operations[selectedOperation].average <=
                           performanceData.operations[selectedOperation].target ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          {getPerformancePercentage(
                            performanceData.operations[selectedOperation].average,
                            performanceData.operations[selectedOperation].target
                          )}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Zuverlässigkeits-Metriken</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Erfolgsrate:</span>
                        <span className={`font-medium ${
                          performanceData.operations[selectedOperation].successRate >= 0.95
                            ? 'text-green-600'
                            : performanceData.operations[selectedOperation].successRate >= 0.90
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}>
                          {formatPercentage(performanceData.operations[selectedOperation].successRate)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Anzahl Operationen:</span>
                        <span className="font-medium">
                          {performanceData.operations[selectedOperation].count}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <Badge className={getStatusColor(performanceData.operations[selectedOperation].status)}>
                          {getStatusIcon(performanceData.operations[selectedOperation].status)}
                          {performanceData.operations[selectedOperation].status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}