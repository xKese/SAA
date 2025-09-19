import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Shield,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

interface OptimizationResultsProps {
  result: {
    optimizationPlan: {
      targetAllocation: Record<string, number>;
      expectedMetrics: {
        expectedReturn: number;
        expectedRisk: number;
        sharpeRatio: number;
        diversificationScore: number;
      };
      rationale: string;
    };
    tradeProposals: Array<{
      name: string;
      action: 'buy' | 'sell' | 'hold';
      amount: number;
      percentage: number;
      reasoning: string;
      priority: 'high' | 'medium' | 'low';
      estimatedCosts: number;
    }>;
    validation: {
      isValid: boolean;
      warnings: string[];
      errors: string[];
      complianceChecks: {
        maxPositionSize: boolean;
        minOrderSize: boolean;
        liquidityRequirements: boolean;
        regulatoryCompliance: boolean;
      };
    };
    projectedAllocation: Record<string, number>;
    expectedImprovement: {
      expectedReturn: number;
      expectedRisk: number;
      sharpeRatio: number;
      diversificationScore: number;
    };
  };
  onProceedToExecution: () => void;
  onBackToWizard: () => void;
}

export function OptimizationResults({ result, onProceedToExecution, onBackToWizard }: OptimizationResultsProps) {
  const [selectedTab, setSelectedTab] = useState('overview');

  const formatPercentage = (value: number) => `${(value * 100).toFixed(2)}%`;
  const formatCurrency = (value: number) => `€${value.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'buy': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'sell': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <DollarSign className="h-4 w-4 text-blue-600" />;
    }
  };

  const totalEstimatedCosts = result.tradeProposals.reduce((sum, trade) => sum + trade.estimatedCosts, 0);
  const buyTrades = result.tradeProposals.filter(t => t.action === 'buy');
  const sellTrades = result.tradeProposals.filter(t => t.action === 'sell');

  return (
    <div className="space-y-6">
      {/* Header mit Validierung */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Optimierungsergebnis
            </CardTitle>
            <div className="flex items-center gap-2">
              {result.validation.isValid ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Validiert
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Validierungsfehler
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!result.validation.isValid && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-red-800 mb-2">Validierungsfehler:</h4>
              <ul className="list-disc list-inside text-red-700 space-y-1">
                {result.validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {result.validation.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-yellow-800 mb-2">Warnungen:</h4>
              <ul className="list-disc list-inside text-yellow-700 space-y-1">
                {result.validation.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Optimierungsstrategie
            </h4>
            <p className="text-blue-700">{result.optimizationPlan.rationale}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="trades">Handelsvorschläge</TabsTrigger>
          <TabsTrigger value="allocation">Allokation</TabsTrigger>
          <TabsTrigger value="metrics">Kennzahlen</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Handelsvorschläge</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Käufe:</span>
                    <span className="font-medium">{buyTrades.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Verkäufe:</span>
                    <span className="font-medium">{sellTrades.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Geschätzte Kosten:</span>
                    <span className="font-medium">{formatCurrency(totalEstimatedCosts)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Erwartete Rendite</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatPercentage(result.expectedImprovement.expectedReturn)}
                </div>
                <p className="text-sm text-gray-600">pro Jahr</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Sharpe Ratio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {result.expectedImprovement.sharpeRatio.toFixed(3)}
                </div>
                <p className="text-sm text-gray-600">Risiko-adjustierte Rendite</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trades" className="space-y-4">
          <div className="space-y-3">
            {result.tradeProposals.map((trade, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getActionIcon(trade.action)}
                      <div>
                        <h4 className="font-medium">{trade.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{trade.reasoning}</p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge className={getPriorityColor(trade.priority)}>
                        {trade.priority}
                      </Badge>
                      <div className="text-sm">
                        <div className="font-medium">{formatCurrency(trade.amount)}</div>
                        <div className="text-gray-500">{formatPercentage(trade.percentage)}</div>
                        <div className="text-xs text-gray-500">Kosten: {formatCurrency(trade.estimatedCosts)}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ziel-Allokation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(result.projectedAllocation).map(([assetClass, percentage]) => (
                  <div key={assetClass} className="flex justify-between items-center">
                    <span className="font-medium">{assetClass}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${percentage * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {formatPercentage(percentage)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Rendite & Risiko
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Erwartete Rendite:</span>
                  <span className="font-medium text-green-600">
                    {formatPercentage(result.expectedImprovement.expectedReturn)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Erwartetes Risiko:</span>
                  <span className="font-medium text-red-600">
                    {formatPercentage(result.expectedImprovement.expectedRisk)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Sharpe Ratio:</span>
                  <span className="font-medium text-blue-600">
                    {result.expectedImprovement.sharpeRatio.toFixed(3)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Diversifikation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Diversifikations-Score:</span>
                  <span className="font-medium text-purple-600">
                    {(result.expectedImprovement.diversificationScore * 100).toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Compliance-Prüfung</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {result.validation.complianceChecks.maxPositionSize ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">Max. Positionsgröße</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.validation.complianceChecks.minOrderSize ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">Min. Ordergröße</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {result.validation.complianceChecks.liquidityRequirements ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">Liquiditätsanforderungen</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.validation.complianceChecks.regulatoryCompliance ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">Regulatorische Compliance</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={onBackToWizard}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Konfiguration
        </Button>

        <Button
          onClick={onProceedToExecution}
          disabled={!result.validation.isValid}
          className="flex items-center gap-2"
        >
          Zur Ausführung
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}