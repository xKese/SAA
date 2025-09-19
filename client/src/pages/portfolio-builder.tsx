import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, CheckCircle, Target, TrendingUp, Shield } from 'lucide-react';
import { RiskProfileSelector } from '@/components/saa/RiskProfileSelector';
import { UniverseExplorer } from '@/components/saa/UniverseExplorer';
import { AllocationChart } from '@/components/saa/AllocationChart';
import { usePortfolioCreation } from '@/hooks/saa/usePortfolioCreation';

const portfolioCreationSchema = z.object({
  name: z.string().min(1, "Portfolio-Name ist erforderlich"),
  description: z.string().optional(),
  amount: z.number().min(1000, "Mindestbetrag: €1.000"),
  riskProfile: z.enum(['conservative', 'moderate', 'aggressive', 'balanced']),
  objectives: z.array(z.string()).optional(),
  timeHorizon: z.enum(['short', 'medium', 'long']),
  constraints: z.object({
    maxPositionSize: z.number().min(0).max(1).optional(),
    excludedInstruments: z.array(z.string()).optional(),
    preferredAssetClasses: z.array(z.string()).optional(),
    liquidityRequirements: z.number().min(0).max(1).optional(),
    esgFocus: z.boolean().optional(),
    taxOptimized: z.boolean().optional()
  }).optional()
});

type FormData = z.infer<typeof portfolioCreationSchema>;

const STEPS = [
  { id: 1, title: 'Grunddaten', description: 'Name und Betrag festlegen' },
  { id: 2, title: 'Risikoprofil', description: 'Ihre Risikobereitschaft definieren' },
  { id: 3, title: 'Investment Universe', description: 'Verfügbare Instrumente erkunden' },
  { id: 4, title: 'Ziel-Allokation', description: 'Strategische Verteilung festlegen' },
  { id: 5, title: 'Überprüfung', description: 'Finale Bestätigung' }
];

export function PortfolioBuilder() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedUniverse, setSelectedUniverse] = useState<any[]>([]);
  const [targetAllocation, setTargetAllocation] = useState<Record<string, number>>({});

  const form = useForm<FormData>({
    resolver: zodResolver(portfolioCreationSchema),
    defaultValues: {
      name: '',
      description: '',
      amount: 10000,
      riskProfile: 'moderate',
      timeHorizon: 'medium',
      objectives: [],
      constraints: {
        maxPositionSize: 0.1,
        esgFocus: false,
        taxOptimized: false,
        liquidityRequirements: 0.05
      }
    }
  });

  const { createPortfolio, isLoading, error } = usePortfolioCreation();

  const progress = (currentStep / STEPS.length) * 100;

  const nextStep = async () => {
    let isValid = true;

    // Validate current step
    switch (currentStep) {
      case 1:
        isValid = await form.trigger(['name', 'amount']);
        break;
      case 2:
        isValid = await form.trigger(['riskProfile', 'timeHorizon']);
        break;
      case 3:
        isValid = selectedUniverse.length > 0;
        break;
      case 4:
        isValid = Object.keys(targetAllocation).length > 0;
        break;
    }

    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const portfolioData = {
        ...data,
        universe: selectedUniverse,
        targetAllocation
      };

      await createPortfolio(portfolioData);
      // Redirect to dashboard on success
    } catch (error) {
      console.error('Portfolio creation failed:', error);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Target className="mx-auto h-12 w-12 text-blue-500 mb-4" />
              <h2 className="text-2xl font-bold">Portfolio Grunddaten</h2>
              <p className="text-muted-foreground">
                Legen Sie die Basis für Ihr strategisches Portfolio fest
              </p>
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Portfolio Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Mein SAA Portfolio" {...field} />
                    </FormControl>
                    <FormDescription>
                      Ein aussagekräftiger Name für Ihr Portfolio
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Beschreiben Sie die Strategie und Ziele dieses Portfolios..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Investitionsbetrag (EUR)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1000"
                        step="1000"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Mindestbetrag: €1.000
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold">Risikoprofil & Anlagehorizont</h2>
              <p className="text-muted-foreground">
                Definieren Sie Ihre Risikobereitschaft und den Zeithorizont
              </p>
            </div>

            <div className="space-y-6">
              <FormField
                control={form.control}
                name="riskProfile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risikoprofil</FormLabel>
                    <FormControl>
                      <RiskProfileSelector
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeHorizon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anlagehorizont</FormLabel>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'short', label: 'Kurz (1-3 Jahre)', icon: '📅' },
                        { value: 'medium', label: 'Mittel (3-7 Jahre)', icon: '📊' },
                        { value: 'long', label: 'Lang (7+ Jahre)', icon: '📈' }
                      ].map((option) => (
                        <Card
                          key={option.value}
                          className={`cursor-pointer transition-all ${
                            field.value === option.value
                              ? 'ring-2 ring-blue-500 bg-blue-50'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => field.onChange(option.value)}
                        >
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl mb-2">{option.icon}</div>
                            <div className="font-medium text-sm">{option.label}</div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <TrendingUp className="mx-auto h-12 w-12 text-purple-500 mb-4" />
              <h2 className="text-2xl font-bold">Investment Universe</h2>
              <p className="text-muted-foreground">
                Erkunden Sie verfügbare Instrumente für Ihr Risikoprofil
              </p>
            </div>

            <UniverseExplorer
              riskProfile={form.watch('riskProfile')}
              constraints={form.watch('constraints')}
              onSelectionChange={setSelectedUniverse}
            />

            {selectedUniverse.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Ausgewählte Instrumente</CardTitle>
                  <CardDescription>
                    {selectedUniverse.length} Instrumente für Ihr Portfolio ausgewählt
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedUniverse.slice(0, 10).map((instrument, index) => (
                      <Badge key={index} variant="secondary">
                        {instrument.name}
                      </Badge>
                    ))}
                    {selectedUniverse.length > 10 && (
                      <Badge variant="outline">
                        +{selectedUniverse.length - 10} weitere
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Target className="mx-auto h-12 w-12 text-orange-500 mb-4" />
              <h2 className="text-2xl font-bold">Ziel-Allokation</h2>
              <p className="text-muted-foreground">
                Definieren Sie die strategische Verteilung Ihres Portfolios
              </p>
            </div>

            <AllocationChart
              data={targetAllocation}
              editable={true}
              onChange={setTargetAllocation}
              riskProfile={form.watch('riskProfile')}
            />
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold">Portfolio Übersicht</h2>
              <p className="text-muted-foreground">
                Überprüfen Sie Ihre Eingaben vor der finalen Erstellung
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Grunddaten</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{form.watch('name')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Betrag:</span>
                    <span className="font-medium">€{form.watch('amount')?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Risikoprofil:</span>
                    <Badge>{form.watch('riskProfile')}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Zeithorizont:</span>
                    <Badge variant="outline">{form.watch('timeHorizon')}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Zusammensetzung</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Instrumente:</span>
                    <span className="font-medium">{selectedUniverse.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Asset Klassen:</span>
                    <span className="font-medium">{Object.keys(targetAllocation).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ESG-Fokus:</span>
                    <Badge variant={form.watch('constraints.esgFocus') ? 'default' : 'secondary'}>
                      {form.watch('constraints.esgFocus') ? 'Ja' : 'Nein'}
                    </Badge>
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
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Portfolio Builder</h1>
        <p className="text-muted-foreground">
          Erstellen Sie ein strategisch optimiertes Portfolio in wenigen Schritten
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">Schritt {currentStep} von {STEPS.length}</span>
          <span className="text-sm text-muted-foreground">{Math.round(progress)}% abgeschlossen</span>
        </div>
        <Progress value={progress} className="mb-4" />

        <div className="flex justify-between">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col items-center text-center ${
                step.id <= currentStep ? 'text-blue-600' : 'text-muted-foreground'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.id <= currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step.id}
              </div>
              <div className="mt-2 hidden sm:block">
                <div className="font-medium text-xs">{step.title}</div>
                <div className="text-xs text-muted-foreground">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="mb-8">
            <CardContent className="p-8">
              {renderStepContent()}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
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
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Wird erstellt...' : 'Portfolio erstellen'}
                <CheckCircle className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}