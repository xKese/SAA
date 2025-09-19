import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type OptimizationMethod =
  | "mean-variance"
  | "black-litterman"
  | "risk-parity"
  | "equal-weight";

interface OptimizationMethodSelectorProps {
  selectedMethod: OptimizationMethod;
  onMethodChange: (method: OptimizationMethod) => void;
}

const methodDescriptions: Record<OptimizationMethod, {
  name: string;
  shortDesc: string;
  fullDesc: string;
  pros: string[];
  cons: string[];
}> = {
  "mean-variance": {
    name: "Mean-Variance Optimization (MVO)",
    shortDesc: "Klassische Markowitz-Portfoliooptimierung",
    fullDesc: "Optimiert das Verhältnis zwischen erwarteter Rendite und Risiko basierend auf historischen Daten.",
    pros: [
      "Mathematisch fundiert und etabliert",
      "Berücksichtigt Korrelationen zwischen Assets",
      "Erzeugt effiziente Portfolios"
    ],
    cons: [
      "Sensibel gegenüber Eingabeparametern",
      "Basiert auf historischen Daten",
      "Kann zu extremen Allokationen führen"
    ]
  },
  "black-litterman": {
    name: "Black-Litterman Modell",
    shortDesc: "Erweiterte Optimierung mit Marktgleichgewicht und Views",
    fullDesc: "Kombiniert Marktgleichgewicht mit subjektiven Erwartungen für stabilere Portfolios.",
    pros: [
      "Stabilere und intuitivere Allokationen",
      "Integriert Marktinformationen",
      "Ermöglicht subjektive Anpassungen"
    ],
    cons: [
      "Komplexere Parameter-Einstellung",
      "Erfordert Marktdaten",
      "Views müssen sorgfältig definiert werden"
    ]
  },
  "risk-parity": {
    name: "Risk Parity",
    shortDesc: "Gleichgewichtete Risikoallokation",
    fullDesc: "Verteilt das Risiko gleichmäßig über alle Asset-Klassen für ausgewogene Diversifikation.",
    pros: [
      "Ausgewogene Diversifikation",
      "Reduziert Konzentrationrisiken",
      "Robust in verschiedenen Marktphasen"
    ],
    cons: [
      "Ignoriert erwartete Renditen",
      "Kann zu hohen Anleihe-Allokationen führen",
      "Erfordert ggf. Leverage"
    ]
  },
  "equal-weight": {
    name: "Equal Weight (1/N)",
    shortDesc: "Gleichgewichtung aller Positionen",
    fullDesc: "Einfache Baseline-Strategie mit gleicher Gewichtung aller Assets.",
    pros: [
      "Einfach und transparent",
      "Keine Schätzfehler",
      "Oft überraschend effektiv"
    ],
    cons: [
      "Ignoriert Risiko und Rendite",
      "Keine Optimierung",
      "Kann ineffizient sein"
    ]
  }
};

export function OptimizationMethodSelector({
  selectedMethod,
  onMethodChange
}: OptimizationMethodSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Optimierungsmethode</CardTitle>
        <CardDescription>
          Wählen Sie die Methode zur Portfolio-Optimierung
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedMethod}
          onValueChange={(value) => onMethodChange(value as OptimizationMethod)}
          className="space-y-4"
        >
          {Object.entries(methodDescriptions).map(([key, method]) => (
            <div key={key} className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
              <RadioGroupItem value={key} id={key} className="mt-1" />
              <div className="flex-1">
                <Label
                  htmlFor={key}
                  className="text-base font-medium cursor-pointer flex items-center gap-2"
                >
                  {method.name}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-md p-4" side="right">
                        <div className="space-y-3">
                          <p className="font-medium">{method.fullDesc}</p>

                          <div>
                            <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Vorteile:</p>
                            <ul className="text-sm space-y-1">
                              {method.pros.map((pro, idx) => (
                                <li key={idx} className="flex items-start">
                                  <span className="text-green-600 dark:text-green-400 mr-1">+</span>
                                  {pro}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Nachteile:</p>
                            <ul className="text-sm space-y-1">
                              {method.cons.map((con, idx) => (
                                <li key={idx} className="flex items-start">
                                  <span className="text-red-600 dark:text-red-400 mr-1">-</span>
                                  {con}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {method.shortDesc}
                </p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}