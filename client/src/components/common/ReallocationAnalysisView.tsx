import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Target, 
  AlertCircle, 
  CheckCircle2,
  DollarSign,
  Percent,
  PiggyBank,
  ArrowUpDown 
} from "lucide-react";

interface ReallocationRecommendation {
  action: "buy" | "sell" | "hold" | "adjust";
  positionName: string;
  isin?: string;
  category: "position" | "assetClass" | "region" | "currency";
  currentAmount: number;
  currentPercentage: number;
  targetAmount: number;
  targetPercentage: number;
  changeAmount: number;
  changePercentage: number;
  priority: "high" | "medium" | "low";
  reasoning: string;
  estimatedCost: number;
  taxImplication?: string;
  // New fields for liquidity injection support
  sourceType?: 'existing' | 'new-cash' | 'mixed';
  requiresSale?: boolean;
  newCashRequired?: number;
  alternativeWithoutSales?: boolean;
}

interface ReallocationSummary {
  totalBuyAmount: number;
  totalSellAmount: number;
  estimatedTotalCost: number;
  numberOfTransactions: number;
  reallocationEfficiency: number;
  riskImpact: "positive" | "negative" | "neutral";
  expectedImprovement: string[];
}

interface DeviationAnalysis {
  assetClassDeviation: number;
  regionDeviation: number;
  currencyDeviation: number;
  overallDeviation: number;
}

interface ClaudeAnalysis {
  detailedRecommendations: string;
  riskAssessment: string;
  taxConsiderations: string;
  alternativeStrategies: string[];
}

interface ReallocationAnalysis {
  id: string;
  portfolioId: string;
  targetStructureId: string;
  totalPortfolioValue: number;
  recommendations: ReallocationRecommendation[];
  summary: ReallocationSummary;
  deviationAnalysis: DeviationAnalysis;
  claudeAnalysis: ClaudeAnalysis;
  status: "draft" | "approved" | "executed";
  analysisDate: Date;
  // New fields for liquidity injection analysis
  cashInjectionAnalysis?: {
    requiredNewCash: number;
    optimalNewCash?: number;
    newPortfolioValue: number;
    cashDeploymentPlan: Array<{
      assetClass: string;
      amount: number;
      percentage: number;
      priority: number;
    }>;
    strategyComparison: {
      sellOnlyStrategy: {
        totalSales: number;
        transactionCosts: number;
        taxImplications: number;
        achievablePercentage: number;
      };
      buyOnlyStrategy: {
        requiredCash: number;
        transactionCosts: number;
        achievablePercentage: number;
      };
      hybridStrategy: {
        salesRequired: number;
        cashRequired: number;
        totalCosts: number;
        achievablePercentage: number;
      };
    };
  };
  selectedStrategy?: 'sell-only' | 'buy-only' | 'hybrid';
}

interface ReallocationAnalysisViewProps {
  analysis: ReallocationAnalysis | null;
  isLoading?: boolean;
  onExecute?: (analysisId: string) => void;
  onModify?: (analysisId: string) => void;
}

export function ReallocationAnalysisView({ 
  analysis, 
  isLoading = false, 
  onExecute, 
  onModify 
}: ReallocationAnalysisViewProps) {
  const [activeTab, setActiveTab] = useState("overview");

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center space-y-2">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-sm text-muted-foreground">Analysiere Reallokation-Möglichkeiten...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center space-y-2">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">Keine Reallokation-Analyse verfügbar</h3>
            <p className="text-sm text-muted-foreground">
              Definieren Sie zunächst eine Zielstruktur und starten Sie die Analyse.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "buy":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "sell":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case "hold":
        return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
      default:
        return <Target className="h-4 w-4 text-orange-600" />;
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  const getRiskImpactColor = (impact: string) => {
    switch (impact) {
      case "positive":
        return "text-green-600";
      case "negative":
        return "text-red-600";
      default:
        return "text-blue-600";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle>Reallokation-Analyse</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={analysis.status === "draft" ? "secondary" : "default"}>
                {analysis.status === "draft" ? "Entwurf" : 
                 analysis.status === "approved" ? "Genehmigt" : "Ausgeführt"}
              </Badge>
              {analysis.status === "draft" && onExecute && (
                <Button 
                  size="sm"
                  onClick={() => onExecute(analysis.id)}
                  className="gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Ausführen
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {analysis.summary.numberOfTransactions}
              </div>
              <div className="text-sm text-muted-foreground">Transaktionen</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">
                €{analysis.summary.estimatedTotalCost.toLocaleString('de-DE')}
              </div>
              <div className="text-sm text-muted-foreground">Geschätzte Kosten</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">
                {analysis.summary.reallocationEfficiency}%
              </div>
              <div className="text-sm text-muted-foreground">Effizienz</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className={`text-2xl font-bold ${getRiskImpactColor(analysis.summary.riskImpact)}`}>
                {analysis.summary.riskImpact === "positive" ? "+" : 
                 analysis.summary.riskImpact === "negative" ? "-" : "~"}
              </div>
              <div className="text-sm text-muted-foreground">Risiko-Impact</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Analysis */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="recommendations">Empfehlungen</TabsTrigger>
          <TabsTrigger value="strategies" disabled={!analysis.cashInjectionAnalysis}>
            Strategien
          </TabsTrigger>
          <TabsTrigger value="deviations">Abweichungen</TabsTrigger>
          <TabsTrigger value="analysis">Claude-Analyse</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Käufe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  €{analysis.summary.totalBuyAmount.toLocaleString('de-DE')}
                </div>
                <p className="text-sm text-muted-foreground">
                  Gesamtvolumen der empfohlenen Käufe
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Verkäufe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  €{analysis.summary.totalSellAmount.toLocaleString('de-DE')}
                </div>
                <p className="text-sm text-muted-foreground">
                  Gesamtvolumen der empfohlenen Verkäufe
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Expected Improvements */}
          <Card>
            <CardHeader>
              <CardTitle>Erwartete Verbesserungen</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.summary.expectedImprovement.map((improvement, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{improvement}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="space-y-3">
            {analysis.recommendations.map((rec, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getActionIcon(rec.action)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{rec.positionName}</h4>
                          <Badge variant={getPriorityBadgeVariant(rec.priority)}>
                            {rec.priority === "high" ? "Hoch" :
                             rec.priority === "medium" ? "Mittel" : "Niedrig"}
                          </Badge>
                          {rec.isin && (
                            <Badge variant="outline" className="text-xs">
                              {rec.isin}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <div className="text-sm text-muted-foreground">Aktuell</div>
                            <div className="font-mono text-sm">
                              €{rec.currentAmount.toLocaleString('de-DE')} 
                              ({rec.currentPercentage.toFixed(1)}%)
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Ziel</div>
                            <div className="font-mono text-sm">
                              €{rec.targetAmount.toLocaleString('de-DE')} 
                              ({rec.targetPercentage.toFixed(1)}%)
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Änderung</div>
                            <div className={`font-mono text-sm ${
                              rec.changeAmount > 0 ? 'text-green-600' : 
                              rec.changeAmount < 0 ? 'text-red-600' : 'text-muted-foreground'
                            }`}>
                              {rec.changeAmount > 0 ? '+' : ''}
                              €{rec.changeAmount.toLocaleString('de-DE')}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Kosten</div>
                            <div className="font-mono text-sm">
                              €{rec.estimatedCost.toLocaleString('de-DE')}
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {rec.reasoning}
                        </p>
                        
                        {rec.taxImplication && (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                              <strong>Steuerliche Auswirkungen:</strong> {rec.taxImplication}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-4">
          {analysis.cashInjectionAnalysis && (
            <>
              {/* Strategy Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Strategie-Vergleich
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Sell Only Strategy */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        <h4 className="font-semibold">Nur Verkäufe</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Verkäufe:</span>
                          <span className="font-mono text-red-600">
                            €{analysis.cashInjectionAnalysis.strategyComparison.sellOnlyStrategy.totalSales.toLocaleString('de-DE')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Transaktionskosten:</span>
                          <span className="font-mono">
                            €{analysis.cashInjectionAnalysis.strategyComparison.sellOnlyStrategy.transactionCosts.toLocaleString('de-DE')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Steuerimpact:</span>
                          <span className="font-mono">
                            €{analysis.cashInjectionAnalysis.strategyComparison.sellOnlyStrategy.taxImplications.toLocaleString('de-DE')}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-muted-foreground">Erreichbarkeit:</span>
                          <span className="font-semibold">
                            {analysis.cashInjectionAnalysis.strategyComparison.sellOnlyStrategy.achievablePercentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Buy Only Strategy */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <PiggyBank className="h-4 w-4 text-green-600" />
                        <h4 className="font-semibold">Nur neue Liquidität</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Benötigte Liquidität:</span>
                          <span className="font-mono text-green-600">
                            €{analysis.cashInjectionAnalysis.strategyComparison.buyOnlyStrategy.requiredCash.toLocaleString('de-DE')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Transaktionskosten:</span>
                          <span className="font-mono">
                            €{analysis.cashInjectionAnalysis.strategyComparison.buyOnlyStrategy.transactionCosts.toLocaleString('de-DE')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Steuerimpact:</span>
                          <span className="font-mono text-green-600">€0</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-muted-foreground">Erreichbarkeit:</span>
                          <span className="font-semibold">
                            {analysis.cashInjectionAnalysis.strategyComparison.buyOnlyStrategy.achievablePercentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Hybrid Strategy */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4 text-blue-600" />
                        <h4 className="font-semibold">Hybrid-Ansatz</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Verkäufe:</span>
                          <span className="font-mono text-red-600">
                            €{analysis.cashInjectionAnalysis.strategyComparison.hybridStrategy.salesRequired.toLocaleString('de-DE')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Neue Liquidität:</span>
                          <span className="font-mono text-green-600">
                            €{analysis.cashInjectionAnalysis.strategyComparison.hybridStrategy.cashRequired.toLocaleString('de-DE')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Gesamtkosten:</span>
                          <span className="font-mono">
                            €{analysis.cashInjectionAnalysis.strategyComparison.hybridStrategy.totalCosts.toLocaleString('de-DE')}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-muted-foreground">Erreichbarkeit:</span>
                          <span className="font-semibold">
                            {analysis.cashInjectionAnalysis.strategyComparison.hybridStrategy.achievablePercentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cash Deployment Plan */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PiggyBank className="h-4 w-4" />
                    Liquiditäts-Allokationsplan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm font-medium border-b pb-2">
                      <span>Gesamt verfügbare Liquidität:</span>
                      <span className="font-mono text-lg">
                        €{analysis.cashInjectionAnalysis.requiredNewCash.toLocaleString('de-DE')}
                      </span>
                    </div>
                    
                    {analysis.cashInjectionAnalysis.cashDeploymentPlan.map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                          <span className="text-sm font-medium">{item.assetClass}</span>
                          <Badge variant="outline" className="text-xs">
                            Priorität {item.priority}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm font-semibold">
                            €{item.amount.toLocaleString('de-DE')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Portfolio Value After Injection */}
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio-Entwicklung</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-sm text-muted-foreground">Aktueller Portfoliowert</div>
                      <div className="text-2xl font-bold">
                        €{analysis.totalPortfolioValue.toLocaleString('de-DE')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Nach Liquiditätszuführung</div>
                      <div className="text-2xl font-bold text-green-600">
                        €{analysis.cashInjectionAnalysis.newPortfolioValue.toLocaleString('de-DE')}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">Wachstum durch Liquiditätszuführung</div>
                    <div className="text-lg font-semibold text-green-600">
                      +€{(analysis.cashInjectionAnalysis.newPortfolioValue - analysis.totalPortfolioValue).toLocaleString('de-DE')}
                      ({(((analysis.cashInjectionAnalysis.newPortfolioValue / analysis.totalPortfolioValue) - 1) * 100).toFixed(1)}%)
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="deviations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Abweichungsanalyse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Asset-Klassen Abweichung</span>
                    <span>{analysis.deviationAnalysis.assetClassDeviation.toFixed(1)}%</span>
                  </div>
                  <Progress value={analysis.deviationAnalysis.assetClassDeviation} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Regionale Abweichung</span>
                    <span>{analysis.deviationAnalysis.regionDeviation.toFixed(1)}%</span>
                  </div>
                  <Progress value={analysis.deviationAnalysis.regionDeviation} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Währungsabweichung</span>
                    <span>{analysis.deviationAnalysis.currencyDeviation.toFixed(1)}%</span>
                  </div>
                  <Progress value={analysis.deviationAnalysis.currencyDeviation} className="h-2" />
                </div>
                
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-sm mb-1 font-semibold">
                    <span>Gesamtabweichung</span>
                    <span>{analysis.deviationAnalysis.overallDeviation.toFixed(1)}%</span>
                  </div>
                  <Progress value={analysis.deviationAnalysis.overallDeviation} className="h-3" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Detaillierte Empfehlungen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">
                  {analysis.claudeAnalysis.detailedRecommendations}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Risikobewertung</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">
                  {analysis.claudeAnalysis.riskAssessment}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Steuerliche Überlegungen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">
                  {analysis.claudeAnalysis.taxConsiderations}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Alternative Strategien</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.claudeAnalysis.alternativeStrategies.map((strategy, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                      <span className="text-sm">{strategy}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}