import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useMutation, useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, CheckCircle, Zap, Target, TrendingUp, Calculator } from 'lucide-react';

interface OptimizationResult {
  optimization: any;
  proposalId: string;
  message: string;
}

interface SimulationScenario {
  id: string;
  scenario: string;
  optimization: any;
  expectedReturn: number;
  expectedRisk: number;
  score: number;
}

interface LiquidityWizardProps {
  portfolioId: string;
  currentValue: number;
  onComplete: (result: OptimizationResult) => void;
}

export function LiquidityWizard({ portfolioId, currentValue, onComplete }: LiquidityWizardProps) {
  const [step, setStep] = useState(1);
  const [liquidityAmount, setLiquidityAmount] = useState(10000);
  const [strategy, setStrategy] = useState<'maintain' | 'rebalance' | 'opportunity'>('rebalance');
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenario | null>(null);
  const [constraints, setConstraints] = useState({
    maxPositionSize: 0.15,
    minOrderSize: 1000,
    maxTurnover: 0.10
  });

  // Optimization Mutation
  const optimizationMutation = useMutation({
    mutationFn: async (params: any) => {
      const response = await fetch(`/api/portfolios/${portfolioId}/liquidity/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (!response.ok) throw new Error('Optimization failed');
      return response.json();
    }
  });

  // Step 1: Liquiditätsbetrag eingeben
  const AmountStep = () => {
    const liquidityPercentage = (liquidityAmount / currentValue) * 100;
    const isSignificantAmount = liquidityPercentage > 10;

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Schritt 1: Liquiditätszufluss</h3>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zusätzliche Liquidität (EUR)
              </label>
              <Input
                type="number"
                value={liquidityAmount}
                onChange={(e) => setLiquidityAmount(Number(e.target.value))}
                className="text-lg"
                min="1000"
                max="10000000"
                step="1000"
              />
              <div className="mt-2 text-sm text-gray-500">
                {liquidityPercentage.toFixed(1)}% des aktuellen Portfoliowerts
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Betrag per Slider anpassen
              </label>
              <Slider
                value={[liquidityAmount]}
                onValueChange={(value) => setLiquidityAmount(value[0])}
                max={Math.max(500000, currentValue)}
                min={1000}
                step={1000}
                className="w-full"
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Aktueller Portfoliowert:</span>
                    <span className="font-semibold">{formatCurrency(currentValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Neue Liquidität:</span>
                    <span className="font-semibold text-green-600">
                      +{formatCurrency(liquidityAmount)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Anteil am Portfolio:</span>
                    <span className="font-semibold">{liquidityPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Neuer Gesamtwert:</span>
                    <span className="font-bold text-lg text-blue-600">
                      {formatCurrency(currentValue + liquidityAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {isSignificantAmount && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-amber-800">Signifikanter Zufluss erkannt</div>
                  <div className="text-amber-700 mt-1">
                    Bei Beträgen über 10% des Portfoliowerts empfiehlt sich ein strategisches Rebalancing
                    zur Optimierung der Gesamtallokation.
                  </div>
                </div>
              </div>
            )}

            <div className="text-sm text-gray-600 space-y-1">
              <p>💡 <strong>Tipp:</strong> Die optimale Allokation hängt von der Höhe des Zuflusses ab.</p>
              <p>• Bis 5%: Proportionale Verteilung oft ausreichend</p>
              <p>• 5-15%: Rebalancing-Chancen prüfen</p>
              <p>• Über 15%: Strategische Neuausrichtung empfohlen</p>
            </div>
          </div>

          <div className="flex justify-end mt-8">
            <Button
              onClick={() => setStep(2)}
              disabled={liquidityAmount < 1000}
              className="px-8"
            >
              Weiter zur Strategieauswahl →
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Step 2: Strategie auswählen
  const StrategyStep = () => {
    const strategies = [
      {
        value: 'maintain',
        label: 'Struktur beibehalten',
        description: 'Neue Mittel proportional zur bestehenden Allokation verteilen',
        icon: <Target className="w-6 h-6" />,
        color: 'blue',
        benefits: ['Einfache Umsetzung', 'Niedrige Kosten', 'Bestehende Strategie bleibt erhalten'],
        suitable: 'Ideal bei kleinen Zuflüssen (<5%) oder wenn die aktuelle Allokation optimal ist'
      },
      {
        value: 'rebalance',
        label: 'Portfolio rebalancieren',
        description: 'Zielallokation wiederherstellen und Abweichungen korrigieren',
        icon: <TrendingUp className="w-6 h-6" />,
        color: 'green',
        benefits: ['Optimiert Risiko-Rendite', 'Korrigiert Abweichungen', 'Disziplinierte Strategie'],
        suitable: 'Empfohlen bei mittleren Zuflüssen (5-15%) oder wenn Rebalancing überfällig ist'
      },
      {
        value: 'opportunity',
        label: 'Chancen nutzen',
        description: 'Untergewichtete oder neue Anlagechancen priorisieren',
        icon: <Zap className="w-6 h-6" />,
        color: 'purple',
        benefits: ['Maximiert Potenzial', 'Nutzt Marktchancen', 'Erhöht Diversifikation'],
        suitable: 'Geeignet bei großen Zuflüssen (>15%) oder besonderen Marktchancen'
      }
    ];

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Target className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-semibold">Schritt 2: Optimierungsstrategie</h3>
          </div>

          <div className="space-y-4">
            {strategies.map((s) => (
              <div
                key={s.value}
                onClick={() => setStrategy(s.value as any)}
                className={`
                  p-5 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md
                  ${strategy === s.value
                    ? `border-${s.color}-500 bg-${s.color}-50 shadow-lg`
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <div className={`
                    p-2 rounded-lg
                    ${strategy === s.value
                      ? `bg-${s.color}-100 text-${s.color}-600`
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    {s.icon}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-lg">{s.label}</h4>
                      {strategy === s.value && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                    </div>

                    <p className="text-gray-600 mb-3">{s.description}</p>

                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="font-medium text-gray-700 mb-1">Vorteile:</div>
                        <ul className="space-y-1">
                          {s.benefits.map((benefit, i) => (
                            <li key={i} className="flex items-center gap-2 text-gray-600">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div className="font-medium text-gray-700 mb-1">Geeignet für:</div>
                        <p className="text-gray-600">{s.suitable}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Constraints Settings */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-4">Erweiterte Einstellungen</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max. Positionsgröße: {(constraints.maxPositionSize * 100).toFixed(0)}%
                </label>
                <Slider
                  value={[constraints.maxPositionSize]}
                  onValueChange={(value) => setConstraints(prev => ({
                    ...prev,
                    maxPositionSize: value[0]
                  }))}
                  max={0.3}
                  min={0.05}
                  step={0.01}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min. Ordergröße: {formatCurrency(constraints.minOrderSize)}
                </label>
                <Slider
                  value={[constraints.minOrderSize]}
                  onValueChange={(value) => setConstraints(prev => ({
                    ...prev,
                    minOrderSize: value[0]
                  }))}
                  max={10000}
                  min={500}
                  step={500}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max. Turnover: {(constraints.maxTurnover * 100).toFixed(0)}%
                </label>
                <Slider
                  value={[constraints.maxTurnover]}
                  onValueChange={(value) => setConstraints(prev => ({
                    ...prev,
                    maxTurnover: value[0]
                  }))}
                  max={0.5}
                  min={0.05}
                  step={0.01}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={() => setStep(1)} className="px-8">
              ← Zurück
            </Button>
            <Button onClick={() => setStep(3)} className="px-8">
              Simulation starten →
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Step 3: Szenario-Simulation
  const SimulationStep = () => {
    const simulationQuery = useQuery({
      queryKey: ['liquidity-simulation', portfolioId, liquidityAmount, strategy],
      queryFn: async () => {
        const response = await fetch(
          `/api/portfolios/${portfolioId}/liquidity/simulate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: liquidityAmount,
              scenarios: ['conservative', 'balanced', 'aggressive']
            })
          }
        );
        if (!response.ok) throw new Error('Simulation failed');
        return response.json();
      }
    });

    if (simulationQuery.isLoading) {
      return <LoadingSimulation />;
    }

    if (simulationQuery.error) {
      return (
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Simulation fehlgeschlagen</h3>
            <p className="text-gray-600 mb-4">
              Die Szenario-Simulation konnte nicht durchgeführt werden.
            </p>
            <Button onClick={() => simulationQuery.refetch()}>
              Erneut versuchen
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold">Schritt 3: Szenario-Vergleich</h3>
          </div>

          <div className="space-y-4">
            {simulationQuery.data?.simulations?.map((scenario: any, index: number) => (
              <ScenarioCard
                key={index}
                scenario={scenario}
                isSelected={selectedScenario?.id === scenario.id}
                onSelect={() => setSelectedScenario(scenario)}
                isRecommended={scenario.scenario === simulationQuery.data.recommendation?.bestScenario}
                liquidityAmount={liquidityAmount}
              />
            ))}
          </div>

          {simulationQuery.data?.comparison && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">KI-Empfehlung</h4>
              <p className="text-blue-800 text-sm">
                {simulationQuery.data.comparison.analysis}
              </p>
            </div>
          )}

          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={() => setStep(2)} className="px-8">
              ← Zurück
            </Button>
            <Button
              onClick={() => setStep(4)}
              disabled={!selectedScenario}
              className="px-8"
            >
              Trade-Vorschau →
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Step 4: Trade-Vorschau
  const TradePreviewStep = () => {
    if (!selectedScenario) return null;

    const executeTrades = async () => {
      const trades = selectedScenario.optimization?.tradeProposals || [];

      const result = await optimizationMutation.mutateAsync({
        amount: liquidityAmount,
        strategy,
        constraints
      });

      onComplete(result);
    };

    const trades = selectedScenario.optimization?.tradeProposals || [];
    const totalCosts = trades.reduce((sum: number, trade: any) => sum + (trade.estimatedCosts || 0), 0);

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-semibold">Schritt 4: Trade-Ausführung</h3>
          </div>

          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg">
              <h4 className="font-semibold mb-4">Optimierungsübersicht</h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Szenario</div>
                  <div className="font-semibold capitalize">{selectedScenario.scenario}</div>
                </div>
                <div>
                  <div className="text-gray-600">Anzahl Trades</div>
                  <div className="font-semibold">{trades.length}</div>
                </div>
                <div>
                  <div className="text-gray-600">Geschätzte Kosten</div>
                  <div className="font-semibold">{formatCurrency(totalCosts)}</div>
                </div>
              </div>
            </div>

            {/* Trade List */}
            <div>
              <h4 className="font-medium mb-3">Geplante Trades</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {trades.map((trade: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={trade.action === 'buy' ? 'default' : 'secondary'}>
                        {trade.action === 'buy' ? 'Kauf' : 'Verkauf'}
                      </Badge>
                      <div>
                        <div className="font-medium">{trade.name}</div>
                        <div className="text-sm text-gray-600">{trade.reasoning}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(trade.amount)}</div>
                      <div className="text-sm text-gray-600">
                        {(trade.percentage * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Warning */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-amber-800">Wichtiger Hinweis</div>
                <div className="text-amber-700 mt-1">
                  Dies ist eine Simulation. Echte Trades würden über Ihre Depotbank ausgeführt.
                  Überprüfen Sie alle Angaben vor der finalen Umsetzung.
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={() => setStep(3)} className="px-8">
              ← Zurück
            </Button>
            <Button
              onClick={executeTrades}
              disabled={optimizationMutation.isPending}
              className="px-8 bg-green-600 hover:bg-green-700"
            >
              {optimizationMutation.isPending ? 'Wird ausgeführt...' : 'Optimierung durchführen'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render aktuellen Step
  const steps = [AmountStep, StrategyStep, SimulationStep, TradePreviewStep];
  const CurrentStep = steps[step - 1];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { label: 'Betrag', icon: Calculator },
            { label: 'Strategie', icon: Target },
            { label: 'Simulation', icon: TrendingUp },
            { label: 'Ausführung', icon: CheckCircle }
          ].map(({ label, icon: Icon }, i) => (
            <div key={i} className="flex items-center">
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center transition-all
                ${i + 1 <= step
                  ? 'bg-green-500 text-white shadow-lg'
                  : i + 1 === step + 1
                  ? 'bg-blue-100 text-blue-600 border-2 border-blue-300'
                  : 'bg-gray-200 text-gray-600'
                }
              `}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`
                ml-3 text-sm font-medium
                ${i + 1 <= step ? 'text-green-600' : 'text-gray-600'}
              `}>
                {label}
              </span>
              {i < 3 && (
                <div className={`
                  w-16 h-0.5 mx-4 transition-all
                  ${i + 1 < step ? 'bg-green-500' : 'bg-gray-300'}
                `} />
              )}
            </div>
          ))}
        </div>
      </div>

      <CurrentStep />
    </div>
  );
}

// Loading Component
function LoadingSimulation() {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold mb-2">Simulation läuft...</h3>
        <p className="text-gray-600">
          Claude analysiert verschiedene Optimierungsszenarien für Ihr Portfolio.
        </p>
      </CardContent>
    </Card>
  );
}

// Scenario Card Component
function ScenarioCard({
  scenario,
  isSelected,
  onSelect,
  isRecommended,
  liquidityAmount
}: {
  scenario: any;
  isSelected: boolean;
  onSelect: () => void;
  isRecommended: boolean;
  liquidityAmount: number;
}) {
  const expectedReturn = scenario.optimization?.expectedMetrics?.expectedReturn || 0;
  const expectedRisk = scenario.optimization?.expectedMetrics?.expectedRisk || 0;
  const sharpeRatio = scenario.optimization?.expectedMetrics?.sharpeRatio || 0;

  const scenarioLabels = {
    conservative: { label: 'Konservativ', color: 'blue', icon: '🛡️' },
    balanced: { label: 'Ausgewogen', color: 'green', icon: '⚖️' },
    aggressive: { label: 'Chancenorientiert', color: 'purple', icon: '🚀' }
  };

  const config = scenarioLabels[scenario.scenario as keyof typeof scenarioLabels] ||
                  { label: scenario.scenario, color: 'gray', icon: '📊' };

  return (
    <div
      onClick={onSelect}
      className={`
        p-5 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md
        ${isSelected
          ? `border-${config.color}-500 bg-${config.color}-50 shadow-lg`
          : 'border-gray-200 hover:border-gray-300'
        }
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-lg">{config.label}</h4>
              {isRecommended && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  Empfohlen
                </Badge>
              )}
              {isSelected && (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
            </div>
            <p className="text-gray-600 text-sm mt-1">
              {scenario.optimization?.rationale || 'Optimierungsdetails werden berechnet...'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <div className="text-gray-600 mb-1">Erwartete Rendite</div>
          <div className="font-semibold text-lg text-green-600">
            {(expectedReturn * 100).toFixed(1)}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-600 mb-1">Erwartetes Risiko</div>
          <div className="font-semibold text-lg text-amber-600">
            {(expectedRisk * 100).toFixed(1)}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-600 mb-1">Sharpe Ratio</div>
          <div className="font-semibold text-lg text-blue-600">
            {sharpeRatio.toFixed(2)}
          </div>
        </div>
      </div>

      {scenario.optimization?.tradeProposals && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              {scenario.optimization.tradeProposals.length} Trades
            </span>
            <span className="font-medium">
              Kosten: {formatCurrency(
                scenario.optimization.tradeProposals.reduce(
                  (sum: number, trade: any) => sum + (trade.estimatedCosts || 0),
                  0
                )
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}