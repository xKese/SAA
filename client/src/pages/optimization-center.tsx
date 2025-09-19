import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  Target,
  Zap,
  Settings,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { OptimizationWizard } from '@/components/saa/OptimizationWizard';
import { AllocationChart } from '@/components/saa/AllocationChart';
import { useOptimization } from '@/hooks/saa/useOptimization';
import { useQuery } from '@tanstack/react-query';

interface OptimizationJob {
  id: string;
  portfolioId: string;
  portfolioName: string;
  type: 'strategic' | 'tactical' | 'risk' | 'liquidity';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: string;
  estimatedCompletion?: string;
  results?: any;
}

interface OptimizationConfig {
  objective: 'return' | 'risk' | 'sharpe' | 'custom';
  constraints: {
    maxPositionSize: number;
    maxTurnover: number;
    minLiquidity: number;
    trackingError?: number;
  };
  preferences: {
    esgWeighting: number;
    lowCostPreference: boolean;
    taxOptimization: boolean;
    rebalanceFrequency: 'monthly' | 'quarterly' | 'semiannual' | 'annual';
  };
}

export function OptimizationCenter() {
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('');
  const [optimizationType, setOptimizationType] = useState<string>('strategic');
  const [config, setConfig] = useState<OptimizationConfig>({
    objective: 'sharpe',
    constraints: {
      maxPositionSize: 10,
      maxTurnover: 50,
      minLiquidity: 5,
      trackingError: 2
    },
    preferences: {
      esgWeighting: 0,
      lowCostPreference: false,
      taxOptimization: false,
      rebalanceFrequency: 'quarterly'
    }
  });

  const { data: portfolios = [] } = useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const response = await fetch('/api/portfolios');
      if (!response.ok) throw new Error('Failed to fetch portfolios');
      return response.json();
    }
  });

  const { data: optimizationJobs = [], refetch: refetchJobs } = useQuery({
    queryKey: ['optimization-jobs'],
    queryFn: async () => {
      const response = await fetch('/api/optimization/jobs');
      if (!response.ok) throw new Error('Failed to fetch optimization jobs');
      return response.json();
    },
    refetchInterval: 5000 // Poll every 5 seconds for running jobs
  });

  const {
    startOptimization,
    cancelOptimization,
    isStarting
  } = useOptimization();

  const runningJobs = optimizationJobs.filter((job: OptimizationJob) =>
    job.status === 'running' || job.status === 'pending'
  );

  const completedJobs = optimizationJobs.filter((job: OptimizationJob) =>
    job.status === 'completed'
  );

  const handleStartOptimization = async () => {
    if (!selectedPortfolio) return;

    try {
      await startOptimization({
        portfolioId: selectedPortfolio,
        type: optimizationType as any,
        config
      });
      refetchJobs();
    } catch (error) {
      console.error('Failed to start optimization:', error);
    }
  };

  const handleCancelOptimization = async (jobId: string) => {
    try {
      await cancelOptimization(jobId);
      refetchJobs();
    } catch (error) {
      console.error('Failed to cancel optimization:', error);
    }
  };

  const getStatusIcon = (status: OptimizationJob['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'running':
        return <Play className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'strategic': return 'bg-blue-100 text-blue-800';
      case 'tactical': return 'bg-purple-100 text-purple-800';
      case 'risk': return 'bg-orange-100 text-orange-800';
      case 'liquidity': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Optimization Center</h1>
          <p className="text-muted-foreground">
            Erweiterte Portfolio-Optimierung mit KI-gestützten Algorithmen
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Einstellungen
          </Button>
          <Button>
            <Zap className="mr-2 h-4 w-4" />
            Neue Optimierung
          </Button>
        </div>
      </div>

      <Tabs defaultValue="configure" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="configure">Konfiguration</TabsTrigger>
          <TabsTrigger value="running">Laufende Jobs ({runningJobs.length})</TabsTrigger>
          <TabsTrigger value="results">Ergebnisse ({completedJobs.length})</TabsTrigger>
          <TabsTrigger value="advanced">Erweitert</TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="configure" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Configuration */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio & Optimierungstyp</CardTitle>
                  <CardDescription>
                    Wählen Sie das Portfolio und den gewünschten Optimierungstyp
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
                    <Label>Optimierungstyp</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'strategic', label: 'Strategisch', icon: Target, desc: 'Langfristige Allokation' },
                        { value: 'tactical', label: 'Taktisch', icon: TrendingUp, desc: 'Kurzfristige Anpassungen' },
                        { value: 'risk', label: 'Risiko', icon: AlertCircle, desc: 'Risiko-optimiert' },
                        { value: 'liquidity', label: 'Liquidität', icon: Zap, desc: 'Liquiditäts-fokussiert' }
                      ].map((type) => (
                        <Card
                          key={type.value}
                          className={`cursor-pointer transition-all ${
                            optimizationType === type.value
                              ? 'ring-2 ring-blue-500 bg-blue-50'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => setOptimizationType(type.value)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <type.icon className="h-5 w-5 mt-1 text-blue-600" />
                              <div>
                                <div className="font-medium">{type.label}</div>
                                <div className="text-sm text-muted-foreground">{type.desc}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Optimierungsziel</CardTitle>
                  <CardDescription>
                    Definieren Sie das primäre Optimierungsziel
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Zielfunktion</Label>
                    <Select
                      value={config.objective}
                      onValueChange={(value: any) => setConfig({...config, objective: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="return">Rendite maximieren</SelectItem>
                        <SelectItem value="risk">Risiko minimieren</SelectItem>
                        <SelectItem value="sharpe">Sharpe Ratio maximieren</SelectItem>
                        <SelectItem value="custom">Benutzerdefiniert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Beschränkungen</CardTitle>
                  <CardDescription>
                    Setzen Sie Limits für die Optimierung
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Max. Positionsgröße: {config.constraints.maxPositionSize}%</Label>
                    <Slider
                      value={[config.constraints.maxPositionSize]}
                      onValueChange={([value]) =>
                        setConfig({
                          ...config,
                          constraints: {...config.constraints, maxPositionSize: value}
                        })
                      }
                      min={1}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Max. Turnover: {config.constraints.maxTurnover}%</Label>
                    <Slider
                      value={[config.constraints.maxTurnover]}
                      onValueChange={([value]) =>
                        setConfig({
                          ...config,
                          constraints: {...config.constraints, maxTurnover: value}
                        })
                      }
                      min={5}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Min. Liquidität: {config.constraints.minLiquidity}%</Label>
                    <Slider
                      value={[config.constraints.minLiquidity]}
                      onValueChange={([value]) =>
                        setConfig({
                          ...config,
                          constraints: {...config.constraints, minLiquidity: value}
                        })
                      }
                      min={0}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Präferenzen</CardTitle>
                  <CardDescription>
                    Zusätzliche Optimierungsparameter
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>ESG-Gewichtung: {config.preferences.esgWeighting}%</Label>
                    <Slider
                      value={[config.preferences.esgWeighting]}
                      onValueChange={([value]) =>
                        setConfig({
                          ...config,
                          preferences: {...config.preferences, esgWeighting: value}
                        })
                      }
                      min={0}
                      max={50}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="low-cost"
                      checked={config.preferences.lowCostPreference}
                      onCheckedChange={(checked) =>
                        setConfig({
                          ...config,
                          preferences: {...config.preferences, lowCostPreference: checked}
                        })
                      }
                    />
                    <Label htmlFor="low-cost">Niedrige Kosten bevorzugen</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="tax-opt"
                      checked={config.preferences.taxOptimization}
                      onCheckedChange={(checked) =>
                        setConfig({
                          ...config,
                          preferences: {...config.preferences, taxOptimization: checked}
                        })
                      }
                    />
                    <Label htmlFor="tax-opt">Steueroptimierung aktivieren</Label>
                  </div>

                  <div className="space-y-2">
                    <Label>Rebalancing-Frequenz</Label>
                    <Select
                      value={config.preferences.rebalanceFrequency}
                      onValueChange={(value: any) =>
                        setConfig({
                          ...config,
                          preferences: {...config.preferences, rebalanceFrequency: value}
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monatlich</SelectItem>
                        <SelectItem value="quarterly">Quartalsweise</SelectItem>
                        <SelectItem value="semiannual">Halbjährlich</SelectItem>
                        <SelectItem value="annual">Jährlich</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Preview & Controls */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Aktuelle Konfiguration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Typ:</span>
                      <Badge className={getTypeColor(optimizationType)}>
                        {optimizationType}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ziel:</span>
                      <span>{config.objective}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max. Position:</span>
                      <span>{config.constraints.maxPositionSize}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ESG:</span>
                      <span>{config.preferences.esgWeighting}%</span>
                    </div>
                  </div>

                  <Separator />

                  <Button
                    onClick={handleStartOptimization}
                    disabled={!selectedPortfolio || isStarting}
                    className="w-full"
                  >
                    {isStarting ? (
                      <>
                        <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                        Wird gestartet...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Optimierung starten
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {selectedPortfolio && (
                <Card>
                  <CardHeader>
                    <CardTitle>Portfolio Vorschau</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <AllocationChart
                        portfolioId={selectedPortfolio}
                        compact={true}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Running Jobs Tab */}
        <TabsContent value="running" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Laufende Optimierungen</CardTitle>
              <CardDescription>
                Überwachen Sie den Fortschritt aktiver Optimierungsläufe
              </CardDescription>
            </CardHeader>
            <CardContent>
              {runningJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Keine laufenden Optimierungen
                </div>
              ) : (
                <div className="space-y-4">
                  {runningJobs.map((job: OptimizationJob) => (
                    <Card key={job.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(job.status)}
                            <span className="font-medium">{job.portfolioName}</span>
                            <Badge className={getTypeColor(job.type)}>{job.type}</Badge>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelOptimization(job.id)}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        </div>
                        <Progress value={job.progress} className="mb-2" />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Fortschritt: {job.progress}%</span>
                          {job.estimatedCompletion && (
                            <span>Geschätzte Fertigstellung: {job.estimatedCompletion}</span>
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

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimierungsergebnisse</CardTitle>
              <CardDescription>
                Abgeschlossene Optimierungen und deren Ergebnisse
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completedJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Noch keine abgeschlossenen Optimierungen
                </div>
              ) : (
                <div className="space-y-4">
                  {completedJobs.map((job: OptimizationJob) => (
                    <Card key={job.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(job.status)}
                            <span className="font-medium">{job.portfolioName}</span>
                            <Badge className={getTypeColor(job.type)}>{job.type}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(job.startedAt).toLocaleDateString()}
                          </div>
                        </div>
                        {job.results && (
                          <div className="grid grid-cols-3 gap-4 mt-4">
                            <div className="text-center">
                              <div className="text-lg font-bold text-green-600">
                                +{job.results.expectedReturn}%
                              </div>
                              <div className="text-sm text-muted-foreground">Erwartete Rendite</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold">
                                {job.results.riskReduction}%
                              </div>
                              <div className="text-sm text-muted-foreground">Risikoreduktion</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold">
                                {job.results.sharpeImprovement}
                              </div>
                              <div className="text-sm text-muted-foreground">Sharpe Verbesserung</div>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline">Details anzeigen</Button>
                          <Button size="sm">Implementieren</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Erweiterte Optimierung</CardTitle>
              <CardDescription>
                Detaillierte Konfiguration für Power-User
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OptimizationWizard
                portfolios={portfolios}
                onComplete={(config) => {
                  console.log('Advanced optimization config:', config);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}