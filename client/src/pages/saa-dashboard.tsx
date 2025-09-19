import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, TrendingUp, BarChart3, Target, AlertTriangle } from 'lucide-react';
import { AllocationChart } from '@/components/saa/AllocationChart';
import { useQuery } from '@tanstack/react-query';

interface Portfolio {
  id: string;
  name: string;
  totalValue: number;
  positionCount: number;
  lastAnalysis?: string;
  status: 'draft' | 'optimized' | 'active' | 'rebalancing';
  riskProfile: 'conservative' | 'moderate' | 'aggressive' | 'balanced';
}

interface DashboardMetrics {
  totalAssets: number;
  portfolioCount: number;
  averageReturn: number;
  riskScore: number;
  rebalancingAlerts: number;
}

export function SAADashboard() {
  const [selectedPortfolio, setSelectedPortfolio] = useState<string | null>(null);

  // Fetch dashboard data
  const { data: portfolios = [], isLoading: portfoliosLoading } = useQuery<Portfolio[]>({
    queryKey: ['saa', 'portfolios'],
    queryFn: async () => {
      const response = await fetch('/api/saa/portfolios');
      if (!response.ok) throw new Error('Failed to fetch portfolios');
      return response.json();
    }
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ['saa', 'metrics'],
    queryFn: async () => {
      const response = await fetch('/api/saa/metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    }
  });

  const getStatusColor = (status: Portfolio['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'optimized': return 'bg-blue-500';
      case 'rebalancing': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskProfileColor = (profile: Portfolio['riskProfile']) => {
    switch (profile) {
      case 'conservative': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-blue-100 text-blue-800';
      case 'balanced': return 'bg-purple-100 text-purple-800';
      case 'aggressive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (portfoliosLoading || metricsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Strategic Asset Allocation</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Portfolio-Strategien und Optimierungen
          </p>
        </div>
        <div className="flex gap-2">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Neues Portfolio
          </Button>
          <Button variant="outline">
            <Target className="mr-2 h-4 w-4" />
            Optimierung starten
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamtvermögen</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{metrics?.totalAssets?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Über {metrics?.portfolioCount || 0} Portfolios
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Durchschnittliche Rendite</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.averageReturn?.toFixed(2) || '0.00'}%
            </div>
            <p className="text-xs text-muted-foreground">
              YTD Performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risiko-Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.riskScore || 0}/100</div>
            <Progress value={metrics?.riskScore || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rebalancing Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metrics?.rebalancingAlerts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Portfolios benötigen Anpassung
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="portfolios" className="space-y-4">
        <TabsList>
          <TabsTrigger value="portfolios">Portfolios</TabsTrigger>
          <TabsTrigger value="allocation">Asset Allocation</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="portfolios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Übersicht</CardTitle>
              <CardDescription>
                Alle Ihre strategischen Asset Allocation Portfolios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {portfolios.map((portfolio) => (
                  <Card
                    key={portfolio.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedPortfolio === portfolio.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedPortfolio(portfolio.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{portfolio.name}</CardTitle>
                        <Badge className={getStatusColor(portfolio.status)}>
                          {portfolio.status}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className={getRiskProfileColor(portfolio.riskProfile)}>
                          {portfolio.riskProfile}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Gesamtwert</span>
                          <span className="font-medium">
                            €{portfolio.totalValue.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Positionen</span>
                          <span className="font-medium">{portfolio.positionCount}</span>
                        </div>
                        {portfolio.lastAnalysis && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Letzte Analyse</span>
                            <span className="text-sm">
                              {new Date(portfolio.lastAnalysis).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          Analysieren
                        </Button>
                        <Button size="sm" className="flex-1">
                          Optimieren
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Allocation Übersicht</CardTitle>
              <CardDescription>
                Visualisierung der strategischen Allokation über alle Portfolios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AllocationChart portfolios={portfolios} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analyse</CardTitle>
              <CardDescription>
                Rendite und Risiko-Kennzahlen Ihrer SAA-Strategien
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Performance-Charts werden hier implementiert
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monitoring & Alerts</CardTitle>
              <CardDescription>
                Aktuelle Warnungen und Empfehlungen für Ihre Portfolios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics?.rebalancingAlerts ? (
                  <div className="border border-orange-200 bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      <h3 className="font-medium text-orange-800">
                        {metrics.rebalancingAlerts} Portfolio(s) benötigen Rebalancing
                      </h3>
                    </div>
                    <p className="text-sm text-orange-700 mt-1">
                      Überprüfen Sie die Allokations-Abweichungen in den markierten Portfolios.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Keine aktiven Alerts. Alle Portfolios sind optimal allokiert.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}