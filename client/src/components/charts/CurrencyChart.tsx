import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CurrencyExposure, getChartColor, formatCurrency, formatPercentage } from "@/types/analysis";

interface CurrencyChartProps {
  data: CurrencyExposure[];
  totalValue?: number;
}

export function CurrencyChart({ data, totalValue }: CurrencyChartProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (currency: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(currency)) {
      newExpandedRows.delete(currency);
    } else {
      newExpandedRows.add(currency);
    }
    setExpandedRows(newExpandedRows);
  };
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Währungsexposition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            Keine Währungsdaten verfügbar
          </div>
        </CardContent>
      </Card>
    );
  }

  // Daten sortieren nach Wert (größte zuerst)
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  // Daten für das Chart vorbereiten
  const chartData = sortedData.map((item, index) => ({
    currency: item.currency,
    value: item.value,
    percentage: item.percentage,
    fill: getChartColor(index),
  }));

  // Chart-Konfiguration
  const chartConfig = sortedData.reduce((acc, item, index) => {
    acc[item.currency] = {
      label: item.currency,
      color: getChartColor(index),
    };
    return acc;
  }, {} as any);

  // Custom Tooltip Renderer
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium flex items-center gap-2">
            <span className="text-lg">{getCurrencyFlag(label)}</span>
            {label}
          </p>
          <p className="text-sm text-muted-foreground">
            Wert: {formatCurrency(data.value)}
          </p>
          <p className="text-sm text-muted-foreground">
            Anteil: {formatPercentage(data.percentage)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Währungs-Icons (Flaggen)
  const getCurrencyFlag = (currency: string) => {
    const flags: { [key: string]: string } = {
      'EUR': '🇪🇺',
      'USD': '🇺🇸',
      'GBP': '🇬🇧',
      'JPY': '🇯🇵',
      'CHF': '🇨🇭',
      'CAD': '🇨🇦',
      'AUD': '🇦🇺',
      'CNY': '🇨🇳',
      'HKD': '🇭🇰',
      'SEK': '🇸🇪',
      'NOK': '🇳🇴',
      'DKK': '🇩🇰',
      'SGD': '🇸🇬',
      'KRW': '🇰🇷',
      'BRL': '🇧🇷',
      'INR': '🇮🇳',
      'ZAR': '🇿🇦',
    };
    
    return flags[currency.toUpperCase()] || '💱';
  };

  // Custom X-Axis Tick Renderer
  const renderXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const flag = getCurrencyFlag(payload.value);
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          x={0} 
          y={0} 
          dy={16} 
          textAnchor="middle" 
          fill="#666" 
          className="text-xs"
        >
          <tspan fontSize="14">{flag}</tspan>
          <tspan x={0} dy={14} fontSize="11">{payload.value}</tspan>
        </text>
      </g>
    );
  };

  // Y-Axis Formatter für Euro-Werte
  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M€`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K€`;
    }
    return `${value.toFixed(0)}€`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Währungsexposition</CardTitle>
        {totalValue && (
          <div className="text-sm text-muted-foreground">
            Gesamtwert: {formatCurrency(totalValue)}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60, // Mehr Platz für die zwei-zeiligen X-Achsen Labels
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="currency" 
              tick={renderXAxisTick}
              height={60}
              interval={0}
            />
            <YAxis 
              tickFormatter={formatYAxis}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="value" 
              fill="#8884d8"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
        
        {/* Aufklappbare Tabellenansicht */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left py-2 w-8"></th>
                <th className="text-left py-2">Währung</th>
                <th className="text-right py-2">Wert</th>
                <th className="text-right py-2">Anteil</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((item, index) => (
                <>
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-2">
                      {item.assignedPositions && item.assignedPositions.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpansion(item.currency)}
                          className="h-6 w-6 p-0"
                        >
                          {expandedRows.has(item.currency) ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </td>
                    <td className="py-2 flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: getChartColor(index) }}
                      />
                      <span className="text-lg mr-1">{getCurrencyFlag(item.currency)}</span>
                      {item.currency}
                    </td>
                    <td className="text-right py-2">{formatCurrency(item.value)}</td>
                    <td className="text-right py-2">{formatPercentage(item.percentage)}</td>
                  </tr>
                  
                  {/* Aufgeklappte Position-Details */}
                  {item.assignedPositions && item.assignedPositions.length > 0 && expandedRows.has(item.currency) && (
                    <tr key={`${index}-details`}>
                      <td colSpan={4} className="p-0">
                        <div className="bg-gray-50 border-l-4 border-gray-200 px-4 py-3">
                          <div className="text-xs font-medium text-gray-600 mb-2">
                            Zugeordnete Positionen:
                          </div>
                          <div className="space-y-1">
                            {item.assignedPositions.map((position, posIndex) => (
                              <div key={posIndex} className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                  <div className="text-gray-600">•</div>
                                  <span className="font-medium">{position.name}</span>
                                  {position.isin && (
                                    <span className="text-gray-500">({position.isin})</span>
                                  )}
                                </div>
                                <div className="flex gap-3 text-gray-600">
                                  <span>{formatCurrency(position.value)}</span>
                                  <span>{formatPercentage(position.percentage)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}