import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  RefreshCw,
  Download,
  AlertCircle,
  BarChart3
} from "lucide-react";
import {
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { OptimizationMethod } from "./OptimizationMethodSelector";
import { ConstraintsConfig } from "./ConstraintsBuilder";
import { OptimizationParameters } from "./OptimizationParameters";

export interface OptimizationResult {
  status: "pending" | "running" | "completed" | "failed";
  progress?: number;
  currentPortfolio: {
    expectedReturn: number;
    risk: number;
    sharpeRatio: number;
    allocations: Record<string, number>;
  };
  optimizedPortfolio?: {
    expectedReturn: number;
    risk: number;
    sharpeRatio: number;
    allocations: Record<string, number>;
    improvements: {
      returnImprovement: number;
      riskReduction: number;
      sharpeImprovement: number;
    };
  };
  efficientFrontier?: Array<{
    risk: number;
    return: number;
    sharpeRatio: number;
  }>;
  rebalancingActions?: Array<{
    assetClass: string;
    currentAllocation: number;
    targetAllocation: number;
    action: "buy" | "sell" | "hold";
    amount: number;
  }>;
  error?: string;
}

interface RunOptimizationProps {
  method: OptimizationMethod;
  constraints: ConstraintsConfig;
  parameters: OptimizationParameters;
  portfolioId: string;
  onOptimize: () => Promise<OptimizationResult>;
  onAcceptResults?: (result: OptimizationResult) => void;
  onRejectResults?: () => void;
}

export function RunOptimization({
  method,
  constraints,
  parameters,
  portfolioId,
  onOptimize,
  onAcceptResults,
  onRejectResults
}: RunOptimizationProps) {
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleOptimize = async () => {
    setIsOptimizing(true);
    setProgress(0);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    try {
      const optimizationResult = await onOptimize();
      setResult(optimizationResult);
      setProgress(100);
    } catch (error) {
      setResult({
        status: "failed",
        currentPortfolio: {
          expectedReturn: 0,
          risk: 0,
          sharpeRatio: 0,
          allocations: {}
        },
        error: error instanceof Error ? error.message : "Optimierung fehlgeschlagen"
      });
    } finally {
      clearInterval(progressInterval);
      setIsOptimizing(false);
    }
  };

  const formatPercentage = (value: number) => {
    const formatted = (value * 100).toFixed(2);
    return `${formatted}%`;
  };

  const formatDifference = (value: number) => {
    const formatted = (value * 100).toFixed(2);
    const prefix = value > 0 ? "+" : "";
    return `${prefix}${formatted}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Optimierung durchführen</CardTitle>
        <CardDescription>
          Starten Sie die Portfolio-Optimierung mit den gewählten Einstellungen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary of Settings */}
        <div className="p-4 rounded-lg bg-accent/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Methode:</span>
            <Badge variant="outline">{method}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Risikoaversion:</span>
            <Badge variant="outline">{parameters.riskAversion.toFixed(1)}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Constraints:</span>
            <Badge variant="outline">
              {constraints.assetClassConstraints.length} definiert
            </Badge>
          </div>
        </div>

        {/* Run Button */}
        {!result && (
          <Button
            onClick={handleOptimize}
            disabled={isOptimizing}
            className="w-full"
            size="lg"
          >
            {isOptimizing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Optimierung läuft...
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Optimierung starten
              </>
            )}
          </Button>
        )}

        {/* Progress Bar */}
        {isOptimizing && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-center text-muted-foreground">
              {progress}% abgeschlossen
            </p>
          </div>
        )}

        {/* Results */}
        {result && result.status === "completed" && result.optimizedPortfolio && (
          <div className="space-y-6">
            {/* Success Alert */}
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>Optimierung erfolgreich</AlertTitle>
              <AlertDescription>
                Die Portfolio-Optimierung wurde erfolgreich abgeschlossen.
              </AlertDescription>
            </Alert>

            {/* Improvements Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Rendite-Verbesserung</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {result.optimizedPortfolio.improvements.returnImprovement > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-2xl font-bold">
                      {formatDifference(result.optimizedPortfolio.improvements.returnImprovement)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Risiko-Reduktion</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {result.optimizedPortfolio.improvements.riskReduction < 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-2xl font-bold">
                      {formatDifference(result.optimizedPortfolio.improvements.riskReduction)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Sharpe Ratio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {result.optimizedPortfolio.improvements.sharpeImprovement > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-2xl font-bold">
                      {formatDifference(result.optimizedPortfolio.improvements.sharpeImprovement)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Results Tabs */}
            <Tabs defaultValue="comparison" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="comparison">Vergleich</TabsTrigger>
                <TabsTrigger value="frontier">Efficient Frontier</TabsTrigger>
                <TabsTrigger value="rebalancing">Umschichtungen</TabsTrigger>
              </TabsList>

              <TabsContent value="comparison" className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metrik</TableHead>
                      <TableHead className="text-right">Aktuell</TableHead>
                      <TableHead className="text-right">Optimiert</TableHead>
                      <TableHead className="text-right">Differenz</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Erwartete Rendite</TableCell>
                      <TableCell className="text-right">
                        {formatPercentage(result.currentPortfolio.expectedReturn)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPercentage(result.optimizedPortfolio.expectedReturn)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={result.optimizedPortfolio.improvements.returnImprovement > 0 ? "text-green-600" : "text-red-600"}>
                          {formatDifference(result.optimizedPortfolio.improvements.returnImprovement)}
                        </span>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Risiko (Volatilität)</TableCell>
                      <TableCell className="text-right">
                        {formatPercentage(result.currentPortfolio.risk)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPercentage(result.optimizedPortfolio.risk)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={result.optimizedPortfolio.improvements.riskReduction < 0 ? "text-green-600" : "text-red-600"}>
                          {formatDifference(result.optimizedPortfolio.improvements.riskReduction)}
                        </span>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Sharpe Ratio</TableCell>
                      <TableCell className="text-right">
                        {result.currentPortfolio.sharpeRatio.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {result.optimizedPortfolio.sharpeRatio.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={result.optimizedPortfolio.improvements.sharpeImprovement > 0 ? "text-green-600" : "text-red-600"}>
                          {formatDifference(result.optimizedPortfolio.improvements.sharpeImprovement)}
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                {/* Allocation Comparison */}
                <div>
                  <h4 className="font-medium mb-3">Asset-Allokation</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset-Klasse</TableHead>
                        <TableHead className="text-right">Aktuell</TableHead>
                        <TableHead className="text-center"></TableHead>
                        <TableHead className="text-right">Optimiert</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.keys(result.currentPortfolio.allocations).map((assetClass) => (
                        <TableRow key={assetClass}>
                          <TableCell>{assetClass}</TableCell>
                          <TableCell className="text-right">
                            {formatPercentage(result.currentPortfolio.allocations[assetClass])}
                          </TableCell>
                          <TableCell className="text-center">
                            <ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPercentage(result.optimizedPortfolio!.allocations[assetClass] || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="frontier" className="space-y-4">
                {result.efficientFrontier && (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="risk"
                          name="Risiko"
                          label={{ value: "Risiko (%)", position: "insideBottom", offset: -5 }}
                          tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                        />
                        <YAxis
                          dataKey="return"
                          name="Rendite"
                          label={{ value: "Erwartete Rendite (%)", angle: -90, position: "insideLeft" }}
                          tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                        />
                        <RechartsTooltip
                          formatter={(value: number) => `${(value * 100).toFixed(2)}%`}
                        />
                        <Legend />

                        {/* Efficient Frontier */}
                        <Line
                          type="monotone"
                          dataKey="return"
                          data={result.efficientFrontier}
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                          name="Efficient Frontier"
                        />

                        {/* Current Portfolio */}
                        <Scatter
                          name="Aktuelles Portfolio"
                          data={[{
                            risk: result.currentPortfolio.risk,
                            return: result.currentPortfolio.expectedReturn
                          }]}
                          fill="#ef4444"
                        />

                        {/* Optimized Portfolio */}
                        <Scatter
                          name="Optimiertes Portfolio"
                          data={[{
                            risk: result.optimizedPortfolio.risk,
                            return: result.optimizedPortfolio.expectedReturn
                          }]}
                          fill="#10b981"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rebalancing" className="space-y-4">
                {result.rebalancingActions && (
                  <>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Die folgenden Umschichtungen sind erforderlich, um das optimierte Portfolio zu erreichen.
                      </AlertDescription>
                    </Alert>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Asset-Klasse</TableHead>
                          <TableHead className="text-right">Aktuell</TableHead>
                          <TableHead className="text-right">Ziel</TableHead>
                          <TableHead className="text-center">Aktion</TableHead>
                          <TableHead className="text-right">Betrag</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.rebalancingActions.map((action) => (
                          <TableRow key={action.assetClass}>
                            <TableCell>{action.assetClass}</TableCell>
                            <TableCell className="text-right">
                              {formatPercentage(action.currentAllocation)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatPercentage(action.targetAllocation)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={
                                  action.action === "buy"
                                    ? "default"
                                    : action.action === "sell"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {action.action === "buy" && "Kaufen"}
                                {action.action === "sell" && "Verkaufen"}
                                {action.action === "hold" && "Halten"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              €{action.amount.toLocaleString("de-DE")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => onAcceptResults?.(result)}
                className="flex-1"
                variant="default"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Optimierung übernehmen
              </Button>
              <Button
                onClick={() => {
                  setResult(null);
                  onRejectResults?.();
                }}
                className="flex-1"
                variant="outline"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Verwerfen
              </Button>
              <Button
                onClick={() => {
                  setResult(null);
                  handleOptimize();
                }}
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Neu berechnen
              </Button>
            </div>
          </div>
        )}

        {/* Error State */}
        {result && result.status === "failed" && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Optimierung fehlgeschlagen</AlertTitle>
            <AlertDescription>
              {result.error || "Ein unerwarteter Fehler ist aufgetreten."}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}