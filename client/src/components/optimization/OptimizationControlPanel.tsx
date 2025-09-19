import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, BarChart3, Play, Save, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import {
  OptimizationMethodSelector,
  OptimizationMethod
} from "./OptimizationMethodSelector";
import {
  ConstraintsBuilder,
  ConstraintsConfig,
  AssetClassConstraint
} from "./ConstraintsBuilder";
import {
  OptimizationParameters as OptimizationParametersComponent,
  OptimizationParameters
} from "./OptimizationParameters";
import {
  RunOptimization,
  OptimizationResult
} from "./RunOptimization";

interface OptimizationControlPanelProps {
  portfolioId: string;
  currentAnalysis?: any;
  isDisabled?: boolean;
  onOptimizationComplete?: (result: OptimizationResult) => void;
}

const defaultAssetClasses = [
  "Aktien",
  "Anleihen",
  "Alternative Investments",
  "Liquidität",
  "Rohstoffe"
];

export function OptimizationControlPanel({
  portfolioId,
  currentAnalysis,
  isDisabled = false,
  onOptimizationComplete
}: OptimizationControlPanelProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("method");

  // State for all optimization settings
  const [optimizationMethod, setOptimizationMethod] = useState<OptimizationMethod>("mean-variance");

  const [constraints, setConstraints] = useState<ConstraintsConfig>({
    assetClassConstraints: defaultAssetClasses.map(name => ({
      name,
      min: 0,
      max: 100,
      current: currentAnalysis?.assetAllocation?.[name] || 0
    })),
    advancedConstraints: {},
    useAdvanced: false
  });

  const [parameters, setParameters] = useState<OptimizationParameters>({
    riskAversion: 5,
    expectedReturns: defaultAssetClasses.reduce((acc, assetClass) => ({
      ...acc,
      [assetClass]: 0.05 // Default 5% expected return
    }), {}),
    confidenceLevel: 50,
    rebalancingFrequency: "quarterly",
    transactionCosts: 0.5
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Update constraints when analysis changes
  useEffect(() => {
    if (currentAnalysis?.assetAllocation) {
      setConstraints(prev => ({
        ...prev,
        assetClassConstraints: prev.assetClassConstraints.map(constraint => ({
          ...constraint,
          current: currentAnalysis.assetAllocation[constraint.name] || 0
        }))
      }));
    }
  }, [currentAnalysis]);

  // Validation function
  const validateSettings = (): boolean => {
    const errors: string[] = [];

    // Validate constraints
    const totalMin = constraints.assetClassConstraints.reduce((sum, c) => sum + c.min, 0);
    const totalMax = constraints.assetClassConstraints.reduce((sum, c) => sum + c.max, 0);

    if (totalMin > 100) {
      errors.push(`Die Summe der Minimum-Constraints (${totalMin}%) übersteigt 100%`);
    }
    if (totalMax < 100) {
      errors.push(`Die Summe der Maximum-Constraints (${totalMax}%) ist kleiner als 100%`);
    }

    // Validate parameters
    if (parameters.riskAversion < 1 || parameters.riskAversion > 10) {
      errors.push("Risikoaversion muss zwischen 1 und 10 liegen");
    }

    if (parameters.transactionCosts < 0 || parameters.transactionCosts > 5) {
      errors.push("Transaktionskosten müssen zwischen 0% und 5% liegen");
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // API mutation for optimization
  const optimizationMutation = useMutation({
    mutationFn: async () => {
      if (!validateSettings()) {
        throw new Error("Ungültige Einstellungen");
      }

      const response = await fetch(`/api/portfolios/${portfolioId}/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: optimizationMethod,
          constraints,
          parameters
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Optimierung fehlgeschlagen");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Optimierung erfolgreich",
        description: "Die Portfolio-Optimierung wurde erfolgreich durchgeführt."
      });
      onOptimizationComplete?.(data);
    },
    onError: (error) => {
      toast({
        title: "Fehler bei der Optimierung",
        description: error instanceof Error ? error.message : "Ein unerwarteter Fehler ist aufgetreten",
        variant: "destructive"
      });
    }
  });

  const handleOptimize = async (): Promise<OptimizationResult> => {
    // Mock result for now - will be replaced with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          status: "completed",
          currentPortfolio: {
            expectedReturn: 0.06,
            risk: 0.12,
            sharpeRatio: 0.42,
            allocations: currentAnalysis?.assetAllocation || {}
          },
          optimizedPortfolio: {
            expectedReturn: 0.075,
            risk: 0.11,
            sharpeRatio: 0.59,
            allocations: {
              "Aktien": 0.45,
              "Anleihen": 0.35,
              "Alternative Investments": 0.10,
              "Liquidität": 0.05,
              "Rohstoffe": 0.05
            },
            improvements: {
              returnImprovement: 0.015,
              riskReduction: -0.01,
              sharpeImprovement: 0.17
            }
          },
          efficientFrontier: Array.from({ length: 20 }, (_, i) => ({
            risk: 0.05 + i * 0.01,
            return: 0.03 + i * 0.005,
            sharpeRatio: (0.03 + i * 0.005) / (0.05 + i * 0.01)
          })),
          rebalancingActions: [
            {
              assetClass: "Aktien",
              currentAllocation: 0.40,
              targetAllocation: 0.45,
              action: "buy" as const,
              amount: 50000
            },
            {
              assetClass: "Anleihen",
              currentAllocation: 0.40,
              targetAllocation: 0.35,
              action: "sell" as const,
              amount: 50000
            }
          ]
        });
      }, 2000);
    });
  };

  const handleAcceptResults = (result: OptimizationResult) => {
    toast({
      title: "Optimierung übernommen",
      description: "Die optimierte Portfolio-Struktur wurde als Zielstruktur gespeichert."
    });
    onOptimizationComplete?.(result);
  };

  const handleRejectResults = () => {
    toast({
      title: "Optimierung verworfen",
      description: "Die Optimierungsergebnisse wurden verworfen."
    });
  };

  const handleNextTab = () => {
    const tabs = ["method", "constraints", "parameters", "run"];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
    }
  };

  const handlePreviousTab = () => {
    const tabs = ["method", "constraints", "parameters", "run"];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
    }
  };

  if (isDisabled) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Bitte führen Sie zuerst eine Portfolio-Analyse durch, bevor Sie die Optimierung starten.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="method" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Methode
          </TabsTrigger>
          <TabsTrigger value="constraints" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Constraints
          </TabsTrigger>
          <TabsTrigger value="parameters" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Parameter
          </TabsTrigger>
          <TabsTrigger value="run" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Ausführung
          </TabsTrigger>
        </TabsList>

        <TabsContent value="method" className="space-y-6">
          <OptimizationMethodSelector
            selectedMethod={optimizationMethod}
            onMethodChange={setOptimizationMethod}
          />
          <div className="flex justify-end">
            <Button onClick={handleNextTab}>
              Weiter zu Constraints
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="constraints" className="space-y-6">
          <ConstraintsBuilder
            constraints={constraints}
            onConstraintsChange={setConstraints}
            currentAllocations={currentAnalysis?.assetAllocation}
          />
          <div className="flex justify-between">
            <Button variant="outline" onClick={handlePreviousTab}>
              Zurück
            </Button>
            <Button onClick={handleNextTab}>
              Weiter zu Parametern
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="parameters" className="space-y-6">
          <OptimizationParametersComponent
            parameters={parameters}
            onParametersChange={setParameters}
            assetClasses={defaultAssetClasses}
            historicalReturns={currentAnalysis?.historicalReturns}
            historicalVolatilities={currentAnalysis?.historicalVolatilities}
          />
          <div className="flex justify-between">
            <Button variant="outline" onClick={handlePreviousTab}>
              Zurück
            </Button>
            <Button onClick={handleNextTab}>
              Weiter zur Ausführung
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="run" className="space-y-6">
          <RunOptimization
            method={optimizationMethod}
            constraints={constraints}
            parameters={parameters}
            portfolioId={portfolioId}
            onOptimize={handleOptimize}
            onAcceptResults={handleAcceptResults}
            onRejectResults={handleRejectResults}
          />
          <div className="flex justify-start">
            <Button variant="outline" onClick={handlePreviousTab}>
              Zurück zu Parametern
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Settings Summary Card */}
      <Card className="bg-accent/10">
        <CardHeader>
          <CardTitle className="text-sm">Aktuelle Einstellungen</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Methode:</span>
            <p className="font-medium">{optimizationMethod}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Risikoaversion:</span>
            <p className="font-medium">{parameters.riskAversion.toFixed(1)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Constraints:</span>
            <p className="font-medium">{constraints.assetClassConstraints.length} definiert</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}