import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  RotateCcw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Calendar,
  DollarSign,
  Target,
  ArrowUpDown,
  Eye,
  Play
} from 'lucide-react';
import { RebalancingMatrix } from '@/components/saa/RebalancingMatrix';
import { AllocationChart } from '@/components/saa/AllocationChart';
import { useRebalancing } from '@/hooks/saa/useRebalancing';
import { useQuery } from '@tanstack/react-query';

interface RebalancingAlert {
  id: string;
  portfolioId: string;
  portfolioName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  deviationType: 'threshold' | 'drift' | 'risk' | 'opportunity';
  currentDeviation: number;
  threshold: number;
  affectedAssetClasses: string[];
  lastCheck: string;
  estimatedCost: number;
}

interface RebalancingPlan {
  id: string;
  portfolioId: string;
  portfolioName: string;
  type: 'threshold' | 'calendar' | 'tactical' | 'cash_flow';
  status: 'draft' | 'approved' | 'executing' | 'completed';
  trades: TradeProposal[];
  expectedCosts: number;
  taxImpact: number;
  riskImpact: number;
  createdAt: string;
}

interface TradeProposal {
  instrumentName: string;
  isin?: string;
  action: 'buy' | 'sell' | 'hold';
  currentValue: number;
  targetValue: number;
  changeAmount: number;
  changePercentage: number;
  priority: 'high' | 'medium' | 'low';
  estimatedCost: number;
}

export function RebalancingHub() {
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('');
  const [rebalancingType, setRebalancingType] = useState<string>('threshold');
  const [thresholds, setThresholds] = useState({
    deviation: 5,
    minTradeSize: 1000,
    maxCosts: 500
  });

  const { data: portfolios = [] } = useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const response = await fetch('/api/portfolios');
      if (!response.ok) throw new Error('Failed to fetch portfolios');
      return response.json();
    }
  });

  const { data: alerts = [] } = useQuery<RebalancingAlert[]>({
    queryKey: ['rebalancing-alerts'],
    queryFn: async () => {
      const response = await fetch('/api/rebalancing/alerts');
      if (!response.ok) throw new Error('Failed to fetch rebalancing alerts');
      return response.json();
    },
    refetchInterval: 30000 // Poll every 30 seconds
  });

  const { data: plans = [] } = useQuery<RebalancingPlan[]>({
    queryKey: ['rebalancing-plans'],
    queryFn: async () => {
      const response = await fetch('/api/rebalancing/plans');
      if (!response.ok) throw new Error('Failed to fetch rebalancing plans');
      return response.json();
    }
  });

  const {
    createRebalancingPlan,
    executeRebalancing,
    isCreating,
    isExecuting
  } = useRebalancing();

  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical').length;
  const highAlerts = alerts.filter(alert => alert.severity === 'high').length;
  const activePlans = plans.filter(plan => plan.status === 'executing').length;

  const getSeverityColor = (severity: RebalancingAlert['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (severity: RebalancingAlert['severity']) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <TrendingUp className="h-4 w-4" />;
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getActionIcon = (action: TradeProposal['action']) => {
    switch (action) {
      case 'buy': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'sell': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'hold': return <ArrowUpDown className="h-4 w-4 text-gray-600" />;
      default: return null;
    }
  };

  const handleCreateRebalancingPlan = async () => {
    if (!selectedPortfolio) return;

    try {
      await createRebalancingPlan({
        portfolioId: selectedPortfolio,
        type: rebalancingType as any,
        thresholds
      });
    } catch (error) {
      console.error('Failed to create rebalancing plan:', error);
    }
  };

  const handleExecutePlan = async (planId: string) => {
    try {
      await executeRebalancing(planId);
    } catch (error) {
      console.error('Failed to execute rebalancing plan:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rebalancing Hub</h1>
          <p className="text-muted-foreground">
            Intelligente Portfolio-Rebalancing und Drift-Monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Zeitplan
          </Button>
          <Button>
            <RotateCcw className="mr-2 h-4 w-4" />
            Neues Rebalancing
          </Button>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kritische Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Sofortige Maßnahmen erforderlich
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hohe Priorität</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{highAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Überwachung empfohlen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive Pläne</CardTitle>
            <Play className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePlans}</div>
            <p className="text-xs text-muted-foreground">
              Werden gerade ausgeführt
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Geschätzte Kosten</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{plans.reduce((sum, plan) => sum + plan.expectedCosts, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Für alle geplanten Rebalancing
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="alerts">Alerts ({alerts.length})</TabsTrigger>
          <TabsTrigger value="plans">Pläne ({plans.length})</TabsTrigger>
          <TabsTrigger value="create">Erstellen</TabsTrigger>
          <TabsTrigger value="monitor">Monitoring</TabsTrigger>
        </TabsList>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rebalancing Alerts</CardTitle>
              <CardDescription>
                Portfolios mit Allokations-Abweichungen, die Aufmerksamkeit benötigen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="mx-auto h-12 w-12 mb-4 text-green-500" />
                  Keine Rebalancing-Alerts. Alle Portfolios sind optimal allokiert.
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <Alert key={alert.id} className={`border-l-4 border-l-${getSeverityColor(alert.severity).split('-')[1]}-500`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(alert.severity)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">{alert.portfolioName}</h3>
                              <Badge className={getSeverityColor(alert.severity)}>
                                {alert.severity}
                              </Badge>
                              <Badge variant="outline">
                                {alert.deviationType}
                              </Badge>
                            </div>
                            <AlertDescription>
                              <div className="space-y-1">
                                <p>
                                  Abweichung: <strong>{alert.currentDeviation.toFixed(1)}%</strong>
                                  (Schwellenwert: {alert.threshold}%)
                                </p>
                                <p className="text-sm">
                                  Betroffene Asset-Klassen: {alert.affectedAssetClasses.join(', ')}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Geschätzte Kosten: €{alert.estimatedCost.toLocaleString()}
                                </p>
                              </div>
                            </AlertDescription>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rebalancing Pläne</CardTitle>
              <CardDescription>
                Erstelle, überprüfe und führe Rebalancing-Pläne aus
              </CardDescription>
            </CardHeader>
            <CardContent>
              {plans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Keine aktiven Rebalancing-Pläne
                </div>
              ) : (
                <div className="space-y-4">
                  {plans.map((plan) => (
                    <Card key={plan.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{plan.portfolioName}</CardTitle>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline">{plan.type}</Badge>
                              <Badge
                                className={
                                  plan.status === 'executing' ? 'bg-blue-500' :
                                  plan.status === 'completed' ? 'bg-green-500' :
                                  plan.status === 'approved' ? 'bg-orange-500' :
                                  'bg-gray-500'
                                }
                              >
                                {plan.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            {new Date(plan.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-lg font-bold">€{plan.expectedCosts.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">Geschätzte Kosten</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold">€{plan.taxImpact.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">Steuerliche Auswirkung</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold">{plan.riskImpact > 0 ? '+' : ''}{plan.riskImpact.toFixed(2)}%</div>
                            <div className="text-sm text-muted-foreground">Risiko-Auswirkung</div>
                          </div>
                        </div>

                        <Separator className="my-4" />

                        <div className="space-y-2">
                          <h4 className="font-medium">Trade-Vorschläge ({plan.trades.length})</h4>
                          <div className="max-h-48 overflow-y-auto">
                            <div className="space-y-2">
                              {plan.trades.slice(0, 5).map((trade, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <div className="flex items-center gap-2">
                                    {getActionIcon(trade.action)}
                                    <span className="font-medium">{trade.instrumentName}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {trade.priority}
                                    </Badge>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-medium">
                                      {trade.changeAmount > 0 ? '+' : ''}€{trade.changeAmount.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {trade.changePercentage > 0 ? '+' : ''}{trade.changePercentage.toFixed(1)}%
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {plan.trades.length > 5 && (
                                <div className="text-center text-sm text-muted-foreground">
                                  +{plan.trades.length - 5} weitere Trades
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" size="sm">Details anzeigen</Button>
                          {plan.status === 'draft' && (
                            <Button size="sm">Genehmigen</Button>
                          )}
                          {plan.status === 'approved' && (
                            <Button
                              size="sm"
                              onClick={() => handleExecutePlan(plan.id)}
                              disabled={isExecuting}
                            >
                              {isExecuting ? 'Wird ausgeführt...' : 'Ausführen'}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Tab */}
        <TabsContent value="create" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Neues Rebalancing erstellen</CardTitle>
                <CardDescription>
                  Konfigurieren Sie ein neues Rebalancing für ein Portfolio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Portfolio</Label>
                  <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
                    <SelectTrigger>
                      <SelectValue placeholder="Portfolio auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {portfolios.map((portfolio: any) => (
                        <SelectItem key={portfolio.id} value={portfolio.id}>
                          {portfolio.name} (€{portfolio.totalValue?.toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Rebalancing-Typ</Label>
                  <Select value={rebalancingType} onValueChange={setRebalancingType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="threshold">Schwellenwert-basiert</SelectItem>
                      <SelectItem value="calendar">Kalender-basiert</SelectItem>
                      <SelectItem value="tactical">Taktisch</SelectItem>
                      <SelectItem value="cash_flow">Cash-Flow-basiert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Schwellenwerte</h4>

                  <div className="space-y-2">
                    <Label>Max. Abweichung (%)</Label>
                    <Input
                      type="number"
                      value={thresholds.deviation}
                      onChange={(e) => setThresholds({
                        ...thresholds,
                        deviation: Number(e.target.value)
                      })}
                      min="1"
                      max="50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Min. Trade-Größe (EUR)</Label>
                    <Input
                      type="number"
                      value={thresholds.minTradeSize}
                      onChange={(e) => setThresholds({
                        ...thresholds,
                        minTradeSize: Number(e.target.value)
                      })}
                      min="100"
                      step="100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Max. Kosten (EUR)</Label>
                    <Input
                      type="number"
                      value={thresholds.maxCosts}
                      onChange={(e) => setThresholds({
                        ...thresholds,
                        maxCosts: Number(e.target.value)
                      })}
                      min="0"
                      step="50"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleCreateRebalancingPlan}
                  disabled={!selectedPortfolio || isCreating}
                  className="w-full"
                >
                  {isCreating ? 'Wird erstellt...' : 'Rebalancing-Plan erstellen'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rebalancing Matrix</CardTitle>
                <CardDescription>
                  Visualisierung der geplanten Änderungen
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedPortfolio ? (
                  <RebalancingMatrix
                    portfolioId={selectedPortfolio}
                    thresholds={thresholds}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Wählen Sie ein Portfolio aus
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Monitor Tab */}
        <TabsContent value="monitor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Drift Monitoring</CardTitle>
              <CardDescription>
                Kontinuierliche Überwachung der Portfolio-Allokationen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {portfolios.slice(0, 4).map((portfolio: any) => (
                  <Card key={portfolio.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{portfolio.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48 mb-4">
                        <AllocationChart
                          portfolioId={portfolio.id}
                          showDrift={true}
                          compact={true}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm text-muted-foreground">Max. Drift</div>
                          <div className="font-bold">2.3%</div>
                        </div>
                        <Badge variant="outline">Innerhalb Limits</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}