import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp } from "lucide-react";
import WidgetContainer from "./WidgetContainer";
import { cn } from "@/lib/utils";

interface Portfolio {
  id: string;
  name: string;
  totalValue: string;
  analysisResults?: any;
}

interface PerformanceChartWidgetProps {
  selectedPortfolioId?: string | null;
  onRefresh?: () => void;
  onMaximize?: () => void;
}

type TimeRange = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y";

interface PerformanceDataPoint {
  date: string;
  value: number;
  formattedDate: string;
  return: number;
}

export function PerformanceChartWidget({
  selectedPortfolioId,
  onRefresh,
  onMaximize,
}: PerformanceChartWidgetProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>("1M");

  const { data: portfolios = [], isLoading, error } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolios"],
  });

  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);

  // Generate simulated performance data
  const performanceData = useMemo((): PerformanceDataPoint[] => {
    if (!selectedPortfolio) return [];

    const baseValue = parseFloat(selectedPortfolio.totalValue);
    const data: PerformanceDataPoint[] = [];

    // Get number of data points based on time range
    const dataPoints = {
      "1D": 24, // hourly data
      "1W": 7,  // daily data
      "1M": 30, // daily data
      "3M": 90, // daily data
      "6M": 180, // daily data
      "1Y": 365, // daily data
    };

    const points = dataPoints[selectedTimeRange];
    const now = new Date();

    // Generate realistic portfolio performance with some volatility
    let currentValue = baseValue;
    const dailyVolatility = 0.015; // 1.5% daily volatility
    const annualReturn = 0.08; // 8% annual return
    const dailyDrift = Math.pow(1 + annualReturn, 1/365) - 1;

    for (let i = points - 1; i >= 0; i--) {
      // Create date based on time range
      const date = new Date(now);
      if (selectedTimeRange === "1D") {
        date.setHours(date.getHours() - i);
      } else {
        date.setDate(date.getDate() - i);
      }

      // Calculate value with drift and random volatility
      const randomChange = (Math.random() - 0.5) * 2 * dailyVolatility;
      const change = dailyDrift + randomChange;
      currentValue = currentValue * (1 + change);

      // Calculate return from initial value
      const returnPercent = ((currentValue - baseValue) / baseValue) * 100;

      data.push({
        date: date.toISOString(),
        value: currentValue,
        formattedDate: selectedTimeRange === "1D"
          ? date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
          : date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
        return: returnPercent,
      });
    }

    return data.reverse();
  }, [selectedPortfolio, selectedTimeRange]);

  const chartConfig = {
    value: {
      label: "Portfolio Wert",
      color: "hsl(var(--chart-1))",
    },
  };

  const currentReturn = performanceData.length > 0
    ? performanceData[performanceData.length - 1].return
    : 0;

  const timeRanges: { key: TimeRange; label: string }[] = [
    { key: "1D", label: "1T" },
    { key: "1W", label: "1W" },
    { key: "1M", label: "1M" },
    { key: "3M", label: "3M" },
    { key: "6M", label: "6M" },
    { key: "1Y", label: "1J" },
  ];

  if (!selectedPortfolioId) {
    return (
      <WidgetContainer
        title="Performance Chart"
        description="Wählen Sie ein Portfolio aus"
        size="large"
        data-widget-id="performance-chart"
      >
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Kein Portfolio ausgewählt</p>
          </div>
        </div>
      </WidgetContainer>
    );
  }

  return (
    <WidgetContainer
      title="Performance"
      description={`${selectedPortfolio?.name} • ${selectedTimeRange}`}
      size="large"
      isLoading={isLoading}
      error={error instanceof Error ? error.message : null}
      onRefresh={onRefresh}
      onMaximize={onMaximize}
      data-widget-id="performance-chart"
      headerActions={
        <div className="flex items-center space-x-2">
          <Badge
            variant={currentReturn >= 0 ? "default" : "destructive"}
            className={cn(
              currentReturn >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            )}
          >
            {currentReturn >= 0 ? "+" : ""}{currentReturn.toFixed(2)}%
          </Badge>
        </div>
      }
    >
      <div className="space-y-4 h-full flex flex-col">
        {/* Time Range Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {timeRanges.map((range) => (
              <Button
                key={range.key}
                variant={selectedTimeRange === range.key ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedTimeRange(range.key)}
                className="h-7 px-2 text-xs"
              >
                {range.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-1" />
            {selectedTimeRange}
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-0">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="formattedDate"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label) => `${label}`}
                      formatter={(value: number) => [
                        `€${value.toLocaleString("de-DE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}`,
                        "Portfolio Wert"
                      ]}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-value)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: "var(--color-value)", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Performance Summary */}
        <div className="grid grid-cols-3 gap-4 text-center border-t pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Höchststand</p>
            <p className="text-sm font-medium">
              €{Math.max(...performanceData.map(d => d.value)).toLocaleString("de-DE")}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tiefststand</p>
            <p className="text-sm font-medium">
              €{Math.min(...performanceData.map(d => d.value)).toLocaleString("de-DE")}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Volatilität</p>
            <p className="text-sm font-medium">
              {(Math.abs(currentReturn) * 0.3).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </WidgetContainer>
  );
}

export default PerformanceChartWidget;