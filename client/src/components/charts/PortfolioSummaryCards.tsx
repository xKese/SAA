import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskMetrics, formatNumber, formatPercentage } from "@/types/analysis";
import { TrendingUp, TrendingDown, Activity, Shield, Target, BarChart3 } from "lucide-react";

interface PortfolioSummaryCardsProps {
  riskMetrics?: RiskMetrics;
  summary?: string;
}

export function PortfolioSummaryCards({ riskMetrics, summary }: PortfolioSummaryCardsProps) {
  if (!riskMetrics && !summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risikometriken</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-gray-500">
            Keine Risikodaten verfügbar
          </div>
        </CardContent>
      </Card>
    );
  }

  // Risiko-Level basierend auf Volatilität bestimmen
  const getRiskLevel = (volatility?: number) => {
    if (!volatility) return { level: 'Unbekannt', color: 'secondary' };
    
    if (volatility < 10) return { level: 'Niedrig', color: 'default' };
    if (volatility < 20) return { level: 'Mittel', color: 'secondary' };
    if (volatility < 30) return { level: 'Hoch', color: 'destructive' };
    return { level: 'Sehr Hoch', color: 'destructive' };
  };

  // Sharpe Ratio Bewertung
  const getSharpeRating = (sharpe?: number) => {
    if (!sharpe) return { rating: 'Unbekannt', color: 'secondary' };
    
    if (sharpe > 2) return { rating: 'Exzellent', color: 'default' };
    if (sharpe > 1) return { rating: 'Gut', color: 'default' };
    if (sharpe > 0.5) return { rating: 'Akzeptabel', color: 'secondary' };
    if (sharpe > 0) return { rating: 'Schwach', color: 'destructive' };
    return { rating: 'Negativ', color: 'destructive' };
  };

  const riskLevel = getRiskLevel(riskMetrics?.volatility);
  const sharpeRating = getSharpeRating(riskMetrics?.sharpeRatio);

  // Hauptmetriken Cards
  const mainMetrics = [
    {
      title: "Erwartete Rendite",
      value: riskMetrics?.expectedReturn,
      formatter: (val: number) => formatPercentage(val),
      icon: TrendingUp,
      description: "Jährlich erwartete Portfoliorendite"
    },
    {
      title: "Volatilität",
      value: riskMetrics?.volatility,
      formatter: (val: number) => formatPercentage(val),
      icon: Activity,
      description: "Standardabweichung der Renditen",
      badge: { text: riskLevel.level, variant: riskLevel.color }
    },
    {
      title: "Sharpe Ratio",
      value: riskMetrics?.sharpeRatio,
      formatter: (val: number) => formatNumber(val, 2),
      icon: Target,
      description: "Rendite pro Risikoeinheit",
      badge: { text: sharpeRating.rating, variant: sharpeRating.color }
    },
    {
      title: "Max. Drawdown",
      value: riskMetrics?.maxDrawdown,
      formatter: (val: number) => formatPercentage(Math.abs(val)),
      icon: TrendingDown,
      description: "Größter historischer Verlust"
    }
  ];

  // Erweiterte Metriken
  const extendedMetrics = [
    {
      title: "Beta",
      value: riskMetrics?.beta,
      formatter: (val: number) => formatNumber(val, 2),
      description: "Marktkorrelation"
    },
    {
      title: "Alpha",
      value: riskMetrics?.alpha,
      formatter: (val: number) => formatPercentage(val),
      description: "Überrendite vs. Markt"
    },
    {
      title: "Information Ratio",
      value: riskMetrics?.informationRatio,
      formatter: (val: number) => formatNumber(val, 2),
      description: "Aktive Rendite pro Tracking Error"
    },
    {
      title: "Tracking Error",
      value: riskMetrics?.trackingError,
      formatter: (val: number) => formatPercentage(val),
      description: "Abweichung zur Benchmark"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Haupt-Risikometriken */}
      {riskMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {mainMetrics.map((metric, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <metric.icon className="h-4 w-4" />
                    {metric.title}
                  </CardTitle>
                  {metric.badge && (
                    <Badge variant={metric.badge.variant as any}>
                      {metric.badge.text}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metric.value !== undefined ? metric.formatter(metric.value) : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Erweiterte Metriken */}
      {riskMetrics && extendedMetrics.some(m => m.value !== undefined) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Erweiterte Risikometriken
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {extendedMetrics.map((metric, index) => (
                metric.value !== undefined && (
                  <div key={index} className="text-center p-3 border rounded">
                    <div className="text-lg font-semibold">
                      {metric.formatter(metric.value)}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {metric.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {metric.description}
                    </div>
                  </div>
                )
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Claude Zusammenfassung */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Analyse-Zusammenfassung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {summary}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risiko-Hinweise */}
      {riskMetrics && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800 text-sm">
              📊 Risiko-Hinweise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-amber-700 space-y-1">
              <p>• Alle Kennzahlen basieren auf historischen Daten und sind keine Garantie für zukünftige Performance.</p>
              <p>• Volatilität misst die Schwankungsbreite, nicht die Verlustwahrscheinlichkeit.</p>
              <p>• Die Sharpe Ratio berücksichtigt nur das Gesamtrisiko, nicht spezifische Risiken.</p>
              <p>• Beta misst die Sensitivität gegenüber Marktbewegungen (Beta {'>'}1 = höhere Marktvolatilität).</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}