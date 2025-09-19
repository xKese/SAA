import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, Activity, Info, Edit2, Save, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface OptimizationParameters {
  riskAversion: number;
  expectedReturns: Record<string, number>;
  correlationMatrix?: Record<string, Record<string, number>>;
  confidenceLevel: number;
  rebalancingFrequency: "monthly" | "quarterly" | "annually";
  transactionCosts: number;
}

interface OptimizationParametersProps {
  parameters: OptimizationParameters;
  onParametersChange: (parameters: OptimizationParameters) => void;
  assetClasses: string[];
  historicalReturns?: Record<string, number>;
  historicalVolatilities?: Record<string, number>;
}

const riskAversionLabels = [
  { value: 1, label: "Sehr risikofreudig", description: "Maximale Rendite, hohe Schwankungen akzeptabel" },
  { value: 3, label: "Risikofreudig", description: "Höhere Rendite wichtiger als Stabilität" },
  { value: 5, label: "Ausgewogen", description: "Balance zwischen Rendite und Risiko" },
  { value: 7, label: "Risikoavers", description: "Stabilität wichtiger als hohe Rendite" },
  { value: 10, label: "Sehr risikoavers", description: "Kapitalerhalt hat oberste Priorität" }
];

export function OptimizationParameters({
  parameters,
  onParametersChange,
  assetClasses,
  historicalReturns = {},
  historicalVolatilities = {}
}: OptimizationParametersProps) {
  const [editingReturns, setEditingReturns] = useState(false);
  const [tempReturns, setTempReturns] = useState(parameters.expectedReturns);
  const [showCorrelationMatrix, setShowCorrelationMatrix] = useState(false);

  const handleRiskAversionChange = (value: number[]) => {
    onParametersChange({
      ...parameters,
      riskAversion: value[0]
    });
  };

  const handleConfidenceLevelChange = (value: number[]) => {
    onParametersChange({
      ...parameters,
      confidenceLevel: value[0]
    });
  };

  const handleReturnEdit = (assetClass: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setTempReturns({
        ...tempReturns,
        [assetClass]: numValue
      });
    }
  };

  const saveReturns = () => {
    onParametersChange({
      ...parameters,
      expectedReturns: tempReturns
    });
    setEditingReturns(false);
  };

  const cancelReturnEdit = () => {
    setTempReturns(parameters.expectedReturns);
    setEditingReturns(false);
  };

  const getRiskAversionLabel = (value: number) => {
    const closest = riskAversionLabels.reduce((prev, curr) =>
      Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev
    );
    return closest;
  };

  const currentRiskLabel = getRiskAversionLabel(parameters.riskAversion);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Optimierungsparameter</CardTitle>
        <CardDescription>
          Feinabstimmung der Risiko- und Renditeerwartungen
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="risk" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="risk">Risikoprofil</TabsTrigger>
            <TabsTrigger value="returns">Renditeerwartungen</TabsTrigger>
            <TabsTrigger value="advanced">Erweitert</TabsTrigger>
          </TabsList>

          <TabsContent value="risk" className="space-y-6 mt-6">
            {/* Risk Aversion Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Risikoaversion</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        Die Risikoaversion bestimmt, wie stark Risiko im Verhältnis zur Rendite
                        gewichtet wird. Höhere Werte führen zu konservativeren Portfolios.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="space-y-3">
                <Slider
                  value={[parameters.riskAversion]}
                  onValueChange={handleRiskAversionChange}
                  min={1}
                  max={10}
                  step={0.5}
                  className="w-full"
                />

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Risikofreudig</span>
                  <span>Ausgewogen</span>
                  <span>Risikoavers</span>
                </div>

                <div className="p-4 rounded-lg bg-accent/50">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-sm">
                      {currentRiskLabel.label}
                    </Badge>
                    <span className="text-lg font-mono">{parameters.riskAversion.toFixed(1)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentRiskLabel.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Transaction Costs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="transaction-costs">Transaktionskosten (%)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        Geschätzte Kosten für Käufe und Verkäufe. Höhere Kosten führen zu
                        weniger häufigen Umschichtungen.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="transaction-costs"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={parameters.transactionCosts}
                onChange={(e) =>
                  onParametersChange({
                    ...parameters,
                    transactionCosts: parseFloat(e.target.value) || 0
                  })
                }
                placeholder="z.B. 0.5"
              />
            </div>
          </TabsContent>

          <TabsContent value="returns" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Erwartete Renditen</Label>
                <Button
                  variant={editingReturns ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditingReturns(!editingReturns)}
                >
                  {editingReturns ? (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Abbrechen
                    </>
                  ) : (
                    <>
                      <Edit2 className="h-4 w-4 mr-1" />
                      Bearbeiten
                    </>
                  )}
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset-Klasse</TableHead>
                    <TableHead className="text-right">Historisch</TableHead>
                    <TableHead className="text-right">Erwartet</TableHead>
                    <TableHead className="text-right">Volatilität</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assetClasses.map((assetClass) => (
                    <TableRow key={assetClass}>
                      <TableCell className="font-medium">{assetClass}</TableCell>
                      <TableCell className="text-right">
                        {historicalReturns[assetClass] ? (
                          <span className="text-muted-foreground">
                            {(historicalReturns[assetClass] * 100).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingReturns ? (
                          <Input
                            type="number"
                            className="w-20 ml-auto"
                            value={tempReturns[assetClass] || 0}
                            onChange={(e) => handleReturnEdit(assetClass, e.target.value)}
                            step="0.1"
                          />
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <span className="font-mono">
                              {((parameters.expectedReturns[assetClass] || 0) * 100).toFixed(1)}%
                            </span>
                            {parameters.expectedReturns[assetClass] > 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-600" />
                            ) : parameters.expectedReturns[assetClass] < 0 ? (
                              <TrendingDown className="h-3 w-3 text-red-600" />
                            ) : null}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {historicalVolatilities[assetClass] ? (
                          <span className="text-muted-foreground">
                            {(historicalVolatilities[assetClass] * 100).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {editingReturns && (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={cancelReturnEdit}>
                    Abbrechen
                  </Button>
                  <Button size="sm" onClick={saveReturns}>
                    <Save className="h-4 w-4 mr-1" />
                    Speichern
                  </Button>
                </div>
              )}

              <Alert>
                <Activity className="h-4 w-4" />
                <AlertDescription>
                  Die erwarteten Renditen basieren auf historischen Daten und Ihrer Markteinschätzung.
                  Diese Werte haben großen Einfluss auf die Optimierung.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6 mt-6">
            {/* Confidence Level for Black-Litterman */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Konfidenzniveau (Black-Litterman)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        Wie stark sollen Ihre Renditeerwartungen gegenüber dem
                        Marktgleichgewicht gewichtet werden?
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="space-y-3">
                <Slider
                  value={[parameters.confidenceLevel]}
                  onValueChange={handleConfidenceLevelChange}
                  min={0}
                  max={100}
                  step={10}
                  className="w-full"
                />

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Markt folgen</span>
                  <span>Ausgewogen</span>
                  <span>Eigene Views</span>
                </div>

                <div className="text-center">
                  <Badge variant="outline">
                    {parameters.confidenceLevel}% Konfidenz
                  </Badge>
                </div>
              </div>
            </div>

            {/* Rebalancing Frequency */}
            <div className="space-y-2">
              <Label>Rebalancing-Frequenz</Label>
              <div className="grid grid-cols-3 gap-2">
                {["monthly", "quarterly", "annually"].map((freq) => (
                  <Button
                    key={freq}
                    variant={parameters.rebalancingFrequency === freq ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      onParametersChange({
                        ...parameters,
                        rebalancingFrequency: freq as typeof parameters.rebalancingFrequency
                      })
                    }
                  >
                    {freq === "monthly" && "Monatlich"}
                    {freq === "quarterly" && "Quartalsweise"}
                    {freq === "annually" && "Jährlich"}
                  </Button>
                ))}
              </div>
            </div>

            {/* Correlation Matrix Toggle */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowCorrelationMatrix(!showCorrelationMatrix)}
              >
                {showCorrelationMatrix ? "Korrelationsmatrix ausblenden" : "Korrelationsmatrix anzeigen"}
              </Button>

              {showCorrelationMatrix && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Die Korrelationsmatrix wird automatisch aus historischen Daten berechnet.
                    Manuelle Anpassungen sind in einer zukünftigen Version verfügbar.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}