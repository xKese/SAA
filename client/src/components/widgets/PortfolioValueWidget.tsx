import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";
import WidgetContainer from "./WidgetContainer";
import { cn } from "@/lib/utils";

interface Portfolio {
  id: string;
  name: string;
  totalValue: string;
  positionCount: number;
  analysisStatus: string;
  createdAt?: string;
}

interface PortfolioValueWidgetProps {
  selectedPortfolioId?: string | null;
  onRefresh?: () => void;
}

interface ValueMetric {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: React.ComponentType<{ className?: string }>;
}

export function PortfolioValueWidget({
  selectedPortfolioId,
  onRefresh,
}: PortfolioValueWidgetProps) {
  const { data: portfolios = [], isLoading, error } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolios"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);

  const valueMetrics = useMemo((): ValueMetric[] => {
    if (!selectedPortfolio) {
      return [
        {
          label: "Portfolio auswählen",
          value: "-",
          icon: DollarSign,
        },
      ];
    }

    const totalValue = parseFloat(selectedPortfolio.totalValue);

    // Simulate daily change (in real app, this would come from backend)
    const simulatedDailyChange = totalValue * 0.0075; // 0.75% daily change simulation
    const simulatedDailyChangePercent = 0.75;

    return [
      {
        label: "Gesamtwert",
        value: `€${totalValue.toLocaleString("de-DE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        change: `€${Math.abs(simulatedDailyChange).toLocaleString("de-DE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        changeType: simulatedDailyChange >= 0 ? "positive" : "negative",
        icon: DollarSign,
      },
      {
        label: "Tagesveränderung",
        value: `${simulatedDailyChangePercent >= 0 ? "+" : ""}${simulatedDailyChangePercent.toFixed(2)}%`,
        change: `heute`,
        changeType: simulatedDailyChangePercent >= 0 ? "positive" : "negative",
        icon: simulatedDailyChangePercent >= 0 ? TrendingUp : TrendingDown,
      },
      {
        label: "Anzahl Positionen",
        value: selectedPortfolio.positionCount.toString(),
        icon: Percent,
      },
    ];
  }, [selectedPortfolio]);

  const lastUpdated = useMemo(() => new Date(), [selectedPortfolio]);

  if (!selectedPortfolioId) {
    return (
      <WidgetContainer
        title="Portfolio Wert"
        description="Wählen Sie ein Portfolio aus"
        size="medium"
        isLoading={false}
        data-widget-id="portfolio-value"
      >
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Kein Portfolio ausgewählt</p>
          </div>
        </div>
      </WidgetContainer>
    );
  }

  return (
    <WidgetContainer
      title="Portfolio Wert"
      description={selectedPortfolio?.name}
      size="medium"
      isLoading={isLoading}
      error={error instanceof Error ? error.message : null}
      onRefresh={onRefresh}
      lastUpdated={lastUpdated}
      data-widget-id="portfolio-value"
    >
      <div className="space-y-4">
        {valueMetrics.map((metric, index) => (
          <ValueMetricDisplay key={index} metric={metric} />
        ))}

        {/* Portfolio Status Indicator */}
        {selectedPortfolio && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Analyse Status:</span>
              <span
                className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  selectedPortfolio.analysisStatus === "completed"
                    ? "bg-green-100 text-green-800"
                    : selectedPortfolio.analysisStatus === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800"
                )}
              >
                {selectedPortfolio.analysisStatus === "completed"
                  ? "Abgeschlossen"
                  : selectedPortfolio.analysisStatus === "pending"
                  ? "In Bearbeitung"
                  : "Nicht verfügbar"
                }
              </span>
            </div>
          </div>
        )}
      </div>
    </WidgetContainer>
  );
}

function ValueMetricDisplay({ metric }: { metric: ValueMetric }) {
  const Icon = metric.icon;

  return (
    <div className="flex items-center space-x-3">
      {Icon && (
        <div className="flex-shrink-0">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
        <div className="flex items-baseline space-x-2">
          <p className="text-xl font-bold">{metric.value}</p>
          {metric.change && (
            <p
              className={cn(
                "text-sm font-medium",
                metric.changeType === "positive" && "text-green-600",
                metric.changeType === "negative" && "text-red-600",
                metric.changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {metric.changeType === "positive" && "+"}
              {metric.change}
            </p>
          )}
        </div>
      </div>
      {metric.changeType && metric.changeType !== "neutral" && (
        <div className="flex-shrink-0">
          {metric.changeType === "positive" ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </div>
      )}
    </div>
  );
}

export default PortfolioValueWidget;