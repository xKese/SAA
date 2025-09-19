import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { PieChart as PieChartIcon } from "lucide-react";
import WidgetContainer from "./WidgetContainer";
import { cn } from "@/lib/utils";

interface Portfolio {
  id: string;
  name: string;
  totalValue: string;
  analysisResults?: {
    assetAllocation?: {
      [key: string]: number;
    };
  };
}

interface AssetAllocationPieWidgetProps {
  selectedPortfolioId?: string | null;
  onRefresh?: () => void;
  onMaximize?: () => void;
}

interface AllocationData {
  name: string;
  value: number;
  percentage: number;
  color: string;
  displayName: string;
}

// Asset class colors mapping
const ASSET_COLORS = {
  "Aktien": "#22c55e",     // green-500
  "Anleihen": "#3b82f6",   // blue-500
  "Cash": "#f59e0b",       // amber-500
  "Rohstoffe": "#ef4444",  // red-500
  "Immobilien": "#8b5cf6", // violet-500
  "Alternative": "#06b6d4", // cyan-500
  "Sonstige": "#6b7280",   // gray-500
};

// German translations for asset classes
const ASSET_TRANSLATIONS = {
  "stocks": "Aktien",
  "bonds": "Anleihen",
  "cash": "Cash",
  "commodities": "Rohstoffe",
  "real-estate": "Immobilien",
  "alternatives": "Alternative",
  "other": "Sonstige",
};

export function AssetAllocationPieWidget({
  selectedPortfolioId,
  onRefresh,
  onMaximize,
}: AssetAllocationPieWidgetProps) {
  const { data: portfolios = [], isLoading, error } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolios"],
  });

  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);

  // Process asset allocation data
  const allocationData = useMemo((): AllocationData[] => {
    if (!selectedPortfolio?.analysisResults?.assetAllocation) {
      // Generate simulated data for demonstration
      const simulatedAllocation = {
        "Aktien": 0.65,
        "Anleihen": 0.25,
        "Cash": 0.05,
        "Rohstoffe": 0.03,
        "Immobilien": 0.02,
      };

      return Object.entries(simulatedAllocation).map(([key, value]) => ({
        name: key,
        value: value * 100,
        percentage: value * 100,
        color: ASSET_COLORS[key as keyof typeof ASSET_COLORS] || ASSET_COLORS["Sonstige"],
        displayName: key,
      }));
    }

    const allocation = selectedPortfolio.analysisResults.assetAllocation;
    const totalValue = parseFloat(selectedPortfolio.totalValue);

    return Object.entries(allocation).map(([key, value]) => {
      const translatedName = ASSET_TRANSLATIONS[key as keyof typeof ASSET_TRANSLATIONS] || key;
      const percentage = (value / totalValue) * 100;

      return {
        name: translatedName,
        value: percentage,
        percentage,
        color: ASSET_COLORS[translatedName as keyof typeof ASSET_COLORS] || ASSET_COLORS["Sonstige"],
        displayName: translatedName,
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }, [selectedPortfolio]);

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    allocationData.forEach(item => {
      config[item.name] = {
        label: item.displayName,
        color: item.color,
      };
    });
    return config;
  }, [allocationData]);

  const totalPercentage = allocationData.reduce((sum, item) => sum + item.percentage, 0);

  if (!selectedPortfolioId) {
    return (
      <WidgetContainer
        title="Asset Allocation"
        description="Wählen Sie ein Portfolio aus"
        size="medium"
        data-widget-id="asset-allocation-pie"
      >
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <PieChartIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Kein Portfolio ausgewählt</p>
          </div>
        </div>
      </WidgetContainer>
    );
  }

  return (
    <WidgetContainer
      title="Asset Allocation"
      description={selectedPortfolio?.name}
      size="medium"
      isLoading={isLoading}
      error={error instanceof Error ? error.message : null}
      onRefresh={onRefresh}
      onMaximize={onMaximize}
      data-widget-id="asset-allocation-pie"
    >
      <div className="space-y-4 h-full flex flex-col">
        {/* Pie Chart */}
        <div className="flex-1 min-h-0">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      const data = payload[0].payload as AllocationData;
                      return (
                        <div className="bg-background border rounded-lg shadow-lg p-3">
                          <p className="font-medium">{data.displayName}</p>
                          <p className="text-sm text-muted-foreground">
                            {data.percentage.toFixed(1)}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Legend with percentages */}
        <div className="space-y-2">
          {allocationData.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium">{item.displayName}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {item.percentage.toFixed(1)}%
              </Badge>
            </div>
          ))}
        </div>

        {/* Total verification */}
        {Math.abs(totalPercentage - 100) > 0.1 && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Gesamt: {totalPercentage.toFixed(1)}%
          </div>
        )}

        {/* Diversification Score */}
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Diversifikation</p>
          <div className="flex items-center justify-center space-x-2">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                allocationData.length >= 4 ? "bg-green-500" :
                allocationData.length >= 2 ? "bg-yellow-500" : "bg-red-500"
              )}
            />
            <span className="text-sm font-medium">
              {allocationData.length >= 4 ? "Gut diversifiziert" :
               allocationData.length >= 2 ? "Mäßig diversifiziert" : "Wenig diversifiziert"}
            </span>
          </div>
        </div>
      </div>
    </WidgetContainer>
  );
}

export default AssetAllocationPieWidget;