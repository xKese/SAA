import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronDown, ChevronUp, AlertCircle, Settings2, Target, Shield, TrendingUp } from "lucide-react";

export interface AssetClassConstraint {
  name: string;
  min: number;
  max: number;
  current?: number;
}

export interface AdvancedConstraints {
  maxSinglePosition?: number;
  maxSectorExposure?: number;
  maxGeographicExposure?: number;
  minLiquidity?: number;
  maxVolatility?: number;
  excludeAssetClasses?: string[];
}

export interface ConstraintsConfig {
  assetClassConstraints: AssetClassConstraint[];
  advancedConstraints: AdvancedConstraints;
  useAdvanced: boolean;
}

interface ConstraintsBuilderProps {
  constraints: ConstraintsConfig;
  onConstraintsChange: (constraints: ConstraintsConfig) => void;
  currentAllocations?: Record<string, number>;
}

const presetTemplates = {
  conservative: {
    name: "Konservativ",
    icon: Shield,
    description: "Niedriges Risiko mit Fokus auf Anleihen",
    assetClasses: {
      "Aktien": { min: 10, max: 30 },
      "Anleihen": { min: 50, max: 80 },
      "Alternative Investments": { min: 0, max: 10 },
      "Liquidität": { min: 5, max: 20 },
      "Rohstoffe": { min: 0, max: 5 }
    }
  },
  balanced: {
    name: "Ausgewogen",
    icon: Target,
    description: "Balanciertes Risiko-Rendite-Verhältnis",
    assetClasses: {
      "Aktien": { min: 30, max: 60 },
      "Anleihen": { min: 30, max: 50 },
      "Alternative Investments": { min: 5, max: 15 },
      "Liquidität": { min: 5, max: 15 },
      "Rohstoffe": { min: 0, max: 10 }
    }
  },
  aggressive: {
    name: "Aggressiv",
    icon: TrendingUp,
    description: "Höheres Risiko mit Fokus auf Wachstum",
    assetClasses: {
      "Aktien": { min: 60, max: 90 },
      "Anleihen": { min: 5, max: 30 },
      "Alternative Investments": { min: 5, max: 20 },
      "Liquidität": { min: 0, max: 10 },
      "Rohstoffe": { min: 0, max: 15 }
    }
  }
};

const defaultAssetClasses = [
  "Aktien",
  "Anleihen",
  "Alternative Investments",
  "Liquidität",
  "Rohstoffe"
];

export function ConstraintsBuilder({
  constraints,
  onConstraintsChange,
  currentAllocations = {}
}: ConstraintsBuilderProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(constraints.useAdvanced);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize asset class constraints if empty
  useEffect(() => {
    if (!constraints.assetClassConstraints.length) {
      const initialConstraints = defaultAssetClasses.map(name => ({
        name,
        min: 0,
        max: 100,
        current: currentAllocations[name] || 0
      }));
      onConstraintsChange({
        ...constraints,
        assetClassConstraints: initialConstraints
      });
    }
  }, []);

  // Validate constraints
  useEffect(() => {
    const totalMin = constraints.assetClassConstraints.reduce((sum, c) => sum + c.min, 0);
    const totalMax = constraints.assetClassConstraints.reduce((sum, c) => sum + c.max, 0);

    if (totalMin > 100) {
      setValidationError(`Minimum-Summe (${totalMin}%) übersteigt 100%`);
    } else if (totalMax < 100) {
      setValidationError(`Maximum-Summe (${totalMax}%) ist kleiner als 100%`);
    } else {
      setValidationError(null);
    }
  }, [constraints.assetClassConstraints]);

  const handleAssetClassConstraintChange = (
    index: number,
    field: "min" | "max",
    value: number
  ) => {
    const newConstraints = [...constraints.assetClassConstraints];
    newConstraints[index] = {
      ...newConstraints[index],
      [field]: value
    };

    // Ensure min <= max
    if (field === "min" && value > newConstraints[index].max) {
      newConstraints[index].max = value;
    } else if (field === "max" && value < newConstraints[index].min) {
      newConstraints[index].min = value;
    }

    onConstraintsChange({
      ...constraints,
      assetClassConstraints: newConstraints
    });
  };

  const applyPresetTemplate = (templateKey: keyof typeof presetTemplates) => {
    const template = presetTemplates[templateKey];
    const newConstraints = constraints.assetClassConstraints.map(constraint => ({
      ...constraint,
      min: template.assetClasses[constraint.name]?.min || 0,
      max: template.assetClasses[constraint.name]?.max || 100
    }));

    onConstraintsChange({
      ...constraints,
      assetClassConstraints: newConstraints
    });
  };

  const handleAdvancedConstraintChange = (
    field: keyof AdvancedConstraints,
    value: number | string[] | undefined
  ) => {
    onConstraintsChange({
      ...constraints,
      advancedConstraints: {
        ...constraints.advancedConstraints,
        [field]: value
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio-Constraints</CardTitle>
        <CardDescription>
          Definieren Sie Grenzen für die Optimierung
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preset Templates */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Vorlagen</Label>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(presetTemplates).map(([key, template]) => {
              const Icon = template.icon;
              return (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPresetTemplate(key as keyof typeof presetTemplates)}
                  className="flex flex-col h-auto p-3 hover:bg-accent"
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="font-medium">{template.name}</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {template.description}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Validation Alert */}
        {validationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        {/* Asset Class Constraints */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Asset-Klassen Limits</Label>
          {constraints.assetClassConstraints.map((constraint, index) => (
            <div key={constraint.name} className="space-y-2 p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{constraint.name}</span>
                {constraint.current !== undefined && (
                  <Badge variant="secondary">
                    Aktuell: {constraint.current.toFixed(1)}%
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Min</Label>
                    <span className="text-xs font-mono">{constraint.min}%</span>
                  </div>
                  <Slider
                    value={[constraint.min]}
                    onValueChange={([value]) =>
                      handleAssetClassConstraintChange(index, "min", value)
                    }
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Max</Label>
                    <span className="text-xs font-mono">{constraint.max}%</span>
                  </div>
                  <Slider
                    value={[constraint.max]}
                    onValueChange={([value]) =>
                      handleAssetClassConstraintChange(index, "max", value)
                    }
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Visual range indicator */}
              <div className="h-2 bg-muted rounded-full relative overflow-hidden">
                <div
                  className="absolute h-full bg-primary/30"
                  style={{
                    left: `${constraint.min}%`,
                    width: `${constraint.max - constraint.min}%`
                  }}
                />
                {constraint.current !== undefined && (
                  <div
                    className="absolute h-full w-1 bg-primary"
                    style={{ left: `${constraint.current}%` }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Advanced Constraints */}
        <Collapsible
          open={isAdvancedOpen}
          onOpenChange={setIsAdvancedOpen}
        >
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Erweiterte Constraints
              </span>
              {isAdvancedOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="use-advanced">Erweiterte Constraints aktivieren</Label>
              <Switch
                id="use-advanced"
                checked={constraints.useAdvanced}
                onCheckedChange={(checked) =>
                  onConstraintsChange({
                    ...constraints,
                    useAdvanced: checked
                  })
                }
              />
            </div>

            {constraints.useAdvanced && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="max-single">Max. Einzelposition (%)</Label>
                  <Input
                    id="max-single"
                    type="number"
                    min="0"
                    max="100"
                    value={constraints.advancedConstraints.maxSinglePosition || ""}
                    onChange={(e) =>
                      handleAdvancedConstraintChange(
                        "maxSinglePosition",
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    placeholder="z.B. 10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-sector">Max. Sektor-Exposure (%)</Label>
                  <Input
                    id="max-sector"
                    type="number"
                    min="0"
                    max="100"
                    value={constraints.advancedConstraints.maxSectorExposure || ""}
                    onChange={(e) =>
                      handleAdvancedConstraintChange(
                        "maxSectorExposure",
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    placeholder="z.B. 25"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-geo">Max. Geografisches Exposure (%)</Label>
                  <Input
                    id="max-geo"
                    type="number"
                    min="0"
                    max="100"
                    value={constraints.advancedConstraints.maxGeographicExposure || ""}
                    onChange={(e) =>
                      handleAdvancedConstraintChange(
                        "maxGeographicExposure",
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    placeholder="z.B. 40"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min-liquidity">Min. Liquidität (%)</Label>
                  <Input
                    id="min-liquidity"
                    type="number"
                    min="0"
                    max="100"
                    value={constraints.advancedConstraints.minLiquidity || ""}
                    onChange={(e) =>
                      handleAdvancedConstraintChange(
                        "minLiquidity",
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    placeholder="z.B. 5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-volatility">Max. Volatilität (%)</Label>
                  <Input
                    id="max-volatility"
                    type="number"
                    min="0"
                    max="100"
                    value={constraints.advancedConstraints.maxVolatility || ""}
                    onChange={(e) =>
                      handleAdvancedConstraintChange(
                        "maxVolatility",
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    placeholder="z.B. 15"
                  />
                </div>
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}