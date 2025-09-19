import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  ArrowRight,
  Target,
  Settings,
  TrendingUp,
  Shield,
  Zap,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface OptimizationWizardProps {
  portfolios: any[];
  onComplete: (config: OptimizationConfig) => void;
}

const optimizationSchema = z.object({
  portfolioId: z.string().min(1, "Portfolio ist erforderlich"),
  objective: z.enum(['return', 'risk', 'sharpe', 'downside', 'calmar', 'custom']),
  constraints: z.object({
    maxPositionSize: z.number().min(1).max(50),
    maxTurnover: z.number().min(0).max(100),
    minLiquidity: z.number().min(0).max(50),
    trackingError: z.number().min(0).max(10).optional(),
    maxDrawdown: z.number().min(0).max(50).optional(),
    sectorLimits: z.record(z.string(), z.number()).optional(),
    countryLimits: z.record(z.string(), z.number()).optional(),
  }),
  preferences: z.object({
    esgWeight: z.number().min(0).max(100),
    lowCostPreference: z.boolean(),
    taxOptimization: z.boolean(),
    liquidityPreference: z.number().min(0).max(10),
    rebalanceFrequency: z.enum(['weekly', 'monthly', 'quarterly', 'semiannual', 'annual']),
    allowShorts: z.boolean(),
    allowLeverage: z.boolean(),
    maxLeverage: z.number().min(100).max(300).optional(),
  }),
  advanced: z.object({
    riskModel: z.enum(['historical', 'factor', 'monte_carlo', 'garch']),
    lookbackPeriod: z.number().min(12).max(120),
    confidence: z.number().min(90).max(99.9),
    optimizationEngine: z.enum(['mean_variance', 'risk_parity', 'black_litterman', 'hierarchical']),
    transactionCosts: z.number().min(0).max(2),
    marketImpact: z.boolean(),
    customObjective: z.string().optional(),
  }).optional()
});

type OptimizationConfig = z.infer<typeof optimizationSchema>;

const STEPS = [
  { id: 1, title: 'Portfolio & Ziel', description: 'Grundkonfiguration', icon: Target },
  { id: 2, title: 'Beschränkungen', description: 'Limits und Grenzen', icon: Shield },
  { id: 3, title: 'Präferenzen', description: 'Persönliche Einstellungen', icon: Settings },
  { id: 4, title: 'Erweitert', description: 'Technische Parameter', icon: Zap },
  { id: 5, title: 'Überprüfung', description: 'Finale Bestätigung', icon: CheckCircle }
];

const OBJECTIVES = {
  return: { label: 'Rendite maximieren', description: 'Fokus auf höchste erwartete Rendite', icon: TrendingUp },
  risk: { label: 'Risiko minimieren', description: 'Niedrigste Volatilität anstreben', icon: Shield },
  sharpe: { label: 'Sharpe Ratio maximieren', description: 'Optimales Rendite-Risiko-Verhältnis', icon: Target },
  downside: { label: 'Downside-Risiko minimieren', description: 'Schutz vor Verlusten', icon: Shield },
  calmar: { label: 'Calmar Ratio maximieren', description: 'Rendite zu Max Drawdown', icon: TrendingUp },
  custom: { label: 'Benutzerdefiniert', description: 'Eigene Zielfunktion', icon: Settings }
};

export function OptimizationWizard({ portfolios, onComplete }: OptimizationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [estimatedDuration, setEstimatedDuration] = useState('5-10 Minuten');

  const form = useForm<OptimizationConfig>({
    resolver: zodResolver(optimizationSchema),
    defaultValues: {
      portfolioId: '',
      objective: 'sharpe',
      constraints: {
        maxPositionSize: 10,
        maxTurnover: 50,
        minLiquidity: 5,
        trackingError: 2,
        maxDrawdown: 20
      },
      preferences: {
        esgWeight: 10,
        lowCostPreference: true,
        taxOptimization: false,
        liquidityPreference: 5,
        rebalanceFrequency: 'quarterly',
        allowShorts: false,
        allowLeverage: false,
        maxLeverage: 100
      },
      advanced: {
        riskModel: 'factor',
        lookbackPeriod: 36,
        confidence: 95,
        optimizationEngine: 'mean_variance',
        transactionCosts: 0.1,
        marketImpact: true
      }
    }
  });

  const progress = (currentStep / STEPS.length) * 100;

  const nextStep = async () => {
    let isValid = true;

    // Validate current step
    switch (currentStep) {
      case 1:
        isValid = await form.trigger(['portfolioId', 'objective']);
        break;
      case 2:
        isValid = await form.trigger(['constraints']);
        break;
      case 3:
        isValid = await form.trigger(['preferences']);
        break;
      case 4:
        isValid = await form.trigger(['advanced']);
        break;
    }

    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      updateEstimatedDuration(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateEstimatedDuration = (step: number) => {
    const config = form.getValues();
    let duration = 5; // Base duration in minutes

    // Adjust based on complexity
    if (config.advanced?.optimizationEngine === 'monte_carlo') duration += 10;
    if (config.advanced?.riskModel === 'garch') duration += 5;
    if (config.constraints.maxPositionSize < 5) duration += 3;
    if (config.preferences.allowShorts) duration += 5;

    setEstimatedDuration(`${duration}-${duration + 5} Minuten`);
  };

  const onSubmit = (data: OptimizationConfig) => {
    onComplete(data);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Target className="mx-auto h-12 w-12 text-blue-500 mb-4" />
              <h2 className="text-2xl font-bold">Portfolio & Optimierungsziel</h2>
              <p className="text-muted-foreground">
                Wählen Sie das Portfolio und definieren Sie Ihr Optimierungsziel
              </p>
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="portfolioId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Portfolio auswählen</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Portfolio wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {portfolios.map((portfolio) => (
                            <SelectItem key={portfolio.id} value={portfolio.id}>
                              {portfolio.name} (€{portfolio.totalValue?.toLocaleString()})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="objective"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Optimierungsziel</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(OBJECTIVES).map(([key, obj]) => {
                          const Icon = obj.icon;
                          return (
                            <Card
                              key={key}
                              className={`cursor-pointer transition-all ${
                                field.value === key
                                  ? 'ring-2 ring-blue-500 bg-blue-50'
                                  : 'hover:bg-gray-50'
                              }`}
                              onClick={() => field.onChange(key)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <Icon className="h-5 w-5 mt-1 text-blue-600" />
                                  <div>
                                    <div className="font-medium">{obj.label}</div>
                                    <div className="text-sm text-muted-foreground">{obj.description}</div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('objective') === 'custom' && (
                <FormField
                  control={form.control}
                  name="advanced.customObjective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Benutzerdefinierte Zielfunktion</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Beschreiben Sie Ihre spezielle Zielfunktion..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Definieren Sie eine individuelle Optimierungsfunktion
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold">Optimierungsbeschränkungen</h2>
              <p className="text-muted-foreground">
                Definieren Sie Limits und Grenzen für die Optimierung
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Positionslimits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="constraints.maxPositionSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max. Positionsgröße: {field.value}%</FormLabel>
                        <FormControl>
                          <Slider
                            value={[field.value]}
                            onValueChange={([value]) => field.onChange(value)}
                            min={1}
                            max={50}
                            step={1}
                            className="w-full"
                          />
                        </FormControl>
                        <FormDescription>
                          Maximaler Anteil einer einzelnen Position
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="constraints.maxTurnover"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max. Turnover: {field.value}%</FormLabel>
                        <FormControl>
                          <Slider
                            value={[field.value]}
                            onValueChange={([value]) => field.onChange(value)}
                            min={0}
                            max={100}
                            step={5}
                            className="w-full"
                          />
                        </FormControl>
                        <FormDescription>
                          Maximaler Portfolioumschlag
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risikobeschränkungen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="constraints.trackingError"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max. Tracking Error: {field.value}%</FormLabel>
                        <FormControl>
                          <Slider
                            value={[field.value || 0]}
                            onValueChange={([value]) => field.onChange(value)}
                            min={0}
                            max={10}
                            step={0.5}
                            className="w-full"
                          />
                        </FormControl>
                        <FormDescription>
                          Abweichung zur Benchmark
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="constraints.maxDrawdown"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max. Drawdown: {field.value}%</FormLabel>
                        <FormControl>
                          <Slider
                            value={[field.value || 0]}
                            onValueChange={([value]) => field.onChange(value)}
                            min={0}
                            max={50}
                            step={1}
                            className="w-full"
                          />
                        </FormControl>
                        <FormDescription>
                          Maximaler Wertverlust
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Liquiditätsanforderungen</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="constraints.minLiquidity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min. Liquidität: {field.value}%</FormLabel>
                      <FormControl>
                        <Slider
                          value={[field.value]}
                          onValueChange={([value]) => field.onChange(value)}
                          min={0}
                          max={50}
                          step={1}
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        Mindestanteil an liquiden Mitteln
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Settings className="mx-auto h-12 w-12 text-purple-500 mb-4" />
              <h2 className="text-2xl font-bold">Optimierungspräferenzen</h2>
              <p className="text-muted-foreground">
                Persönliche Einstellungen und Präferenzen
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>ESG & Nachhaltigkeit</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="preferences.esgWeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ESG-Gewichtung: {field.value}%</FormLabel>
                        <FormControl>
                          <Slider
                            value={[field.value]}
                            onValueChange={([value]) => field.onChange(value)}
                            min={0}
                            max={100}
                            step={5}
                            className="w-full"
                          />
                        </FormControl>
                        <FormDescription>
                          Anteil ESG-konformer Investments
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Kosten & Steuern</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="preferences.lowCostPreference"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Kostenfokus</FormLabel>
                          <FormDescription>
                            Niedrige Kosten bevorzugen
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="preferences.taxOptimization"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Steueroptimierung</FormLabel>
                          <FormDescription>
                            Steuerliche Effizienz
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Rebalancing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="preferences.rebalanceFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rebalancing-Frequenz</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekly">Wöchentlich</SelectItem>
                              <SelectItem value="monthly">Monatlich</SelectItem>
                              <SelectItem value="quarterly">Quartalsweise</SelectItem>
                              <SelectItem value="semiannual">Halbjährlich</SelectItem>
                              <SelectItem value="annual">Jährlich</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="preferences.liquidityPreference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Liquiditätspräferenz: {field.value}/10</FormLabel>
                        <FormControl>
                          <Slider
                            value={[field.value]}
                            onValueChange={([value]) => field.onChange(value)}
                            min={0}
                            max={10}
                            step={1}
                            className="w-full"
                          />
                        </FormControl>
                        <FormDescription>
                          Wichtigkeit von Liquidität
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Erweiterte Strategien</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="preferences.allowShorts"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Leerverkäufe</FormLabel>
                          <FormDescription>
                            Short-Positionen erlauben
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="preferences.allowLeverage"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Leverage</FormLabel>
                          <FormDescription>
                            Hebelwirkung erlauben
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch('preferences.allowLeverage') && (
                    <FormField
                      control={form.control}
                      name="preferences.maxLeverage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max. Leverage: {field.value}%</FormLabel>
                          <FormControl>
                            <Slider
                              value={[field.value || 100]}
                              onValueChange={([value]) => field.onChange(value)}
                              min={100}
                              max={300}
                              step={10}
                              className="w-full"
                            />
                          </FormControl>
                          <FormDescription>
                            Maximale Hebelwirkung
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Zap className="mx-auto h-12 w-12 text-orange-500 mb-4" />
              <h2 className="text-2xl font-bold">Erweiterte Parameter</h2>
              <p className="text-muted-foreground">
                Technische Einstellungen für Power-User
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Diese Einstellungen sind für erfahrene Benutzer. Standard-Werte sind für die meisten Anwendungsfälle optimal.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Risikomodellierung</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="advanced.riskModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Risikomodell</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="historical">Historisch</SelectItem>
                              <SelectItem value="factor">Faktor-basiert</SelectItem>
                              <SelectItem value="monte_carlo">Monte Carlo</SelectItem>
                              <SelectItem value="garch">GARCH</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="advanced.lookbackPeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lookback-Periode: {field.value} Monate</FormLabel>
                        <FormControl>
                          <Slider
                            value={[field.value]}
                            onValueChange={([value]) => field.onChange(value)}
                            min={12}
                            max={120}
                            step={6}
                            className="w-full"
                          />
                        </FormControl>
                        <FormDescription>
                          Historische Datenperiode
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="advanced.confidence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Konfidenz: {field.value}%</FormLabel>
                        <FormControl>
                          <Slider
                            value={[field.value]}
                            onValueChange={([value]) => field.onChange(value)}
                            min={90}
                            max={99.9}
                            step={0.5}
                            className="w-full"
                          />
                        </FormControl>
                        <FormDescription>
                          Statistische Konfidenz
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Optimierung</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="advanced.optimizationEngine"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Optimierungs-Engine</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mean_variance">Mean-Variance</SelectItem>
                              <SelectItem value="risk_parity">Risk Parity</SelectItem>
                              <SelectItem value="black_litterman">Black-Litterman</SelectItem>
                              <SelectItem value="hierarchical">Hierarchical</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="advanced.transactionCosts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transaktionskosten: {field.value}%</FormLabel>
                        <FormControl>
                          <Slider
                            value={[field.value]}
                            onValueChange={([value]) => field.onChange(value)}
                            min={0}
                            max={2}
                            step={0.05}
                            className="w-full"
                          />
                        </FormControl>
                        <FormDescription>
                          Geschätzte Handelskosten
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="advanced.marketImpact"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Market Impact</FormLabel>
                          <FormDescription>
                            Marktauswirkungen berücksichtigen
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold">Konfiguration überprüfen</h2>
              <p className="text-muted-foreground">
                Überprüfen Sie Ihre Optimierungseinstellungen
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Grundkonfiguration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Portfolio:</span>
                    <span className="font-medium">
                      {portfolios.find(p => p.id === form.watch('portfolioId'))?.name || 'Nicht ausgewählt'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ziel:</span>
                    <Badge>{OBJECTIVES[form.watch('objective') as keyof typeof OBJECTIVES]?.label}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max. Position:</span>
                    <span className="font-medium">{form.watch('constraints.maxPositionSize')}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max. Turnover:</span>
                    <span className="font-medium">{form.watch('constraints.maxTurnover')}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Präferenzen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ESG-Gewichtung:</span>
                    <span className="font-medium">{form.watch('preferences.esgWeight')}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kostenfokus:</span>
                    <Badge variant={form.watch('preferences.lowCostPreference') ? 'default' : 'secondary'}>
                      {form.watch('preferences.lowCostPreference') ? 'Ja' : 'Nein'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rebalancing:</span>
                    <span className="font-medium">{form.watch('preferences.rebalanceFrequency')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Leerverkäufe:</span>
                    <Badge variant={form.watch('preferences.allowShorts') ? 'default' : 'secondary'}>
                      {form.watch('preferences.allowShorts') ? 'Erlaubt' : 'Nicht erlaubt'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Erweiterte Einstellungen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Risikomodell:</span>
                    <span className="font-medium">{form.watch('advanced.riskModel')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Engine:</span>
                    <span className="font-medium">{form.watch('advanced.optimizationEngine')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lookback:</span>
                    <span className="font-medium">{form.watch('advanced.lookbackPeriod')} Monate</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Konfidenz:</span>
                    <span className="font-medium">{form.watch('advanced.confidence')}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Geschätzte Ausführung</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Dauer: {estimatedDuration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Geschätzte Kosten: €{(form.watch('advanced.transactionCosts') * 100).toFixed(0)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Komplexität: {
                      form.watch('advanced.optimizationEngine') === 'monte_carlo' ? 'Hoch' :
                      form.watch('preferences.allowShorts') ? 'Mittel' : 'Niedrig'
                    }</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Schritt {currentStep} von {STEPS.length}</span>
          <span>{Math.round(progress)}% abgeschlossen</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Steps Navigation */}
      <div className="flex justify-between">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`flex flex-col items-center text-center ${
                step.id <= currentStep ? 'text-blue-600' : 'text-muted-foreground'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step.id <= currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-2 hidden sm:block">
                <div className="font-medium text-xs">{step.title}</div>
                <div className="text-xs text-muted-foreground">{step.description}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardContent className="p-8">
              {renderStepContent()}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück
            </Button>

            {currentStep < STEPS.length ? (
              <Button type="button" onClick={nextStep}>
                Weiter
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit">
                Optimierung starten
                <CheckCircle className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}