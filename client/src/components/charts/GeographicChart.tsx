import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { GeographicAllocation, getChartColor, formatCurrency, formatPercentage } from "@/types/analysis";

interface GeographicChartProps {
  data: GeographicAllocation[];
  totalValue?: number;
}

export function GeographicChart({ data, totalValue }: GeographicChartProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (region: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(region)) {
      newExpandedRows.delete(region);
    } else {
      newExpandedRows.add(region);
    }
    setExpandedRows(newExpandedRows);
  };
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Geografische Verteilung</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            Keine geografischen Daten verfügbar
          </div>
        </CardContent>
      </Card>
    );
  }

  // Daten für das Chart vorbereiten
  const chartData = data.map((item, index) => ({
    name: item.region,
    value: item.value,
    percentage: item.percentage,
    color: getChartColor(index, 'secondary'), // Andere Farbpalette für Unterscheidung
  }));

  // Chart-Konfiguration
  const chartConfig = data.reduce((acc, item, index) => {
    acc[item.region] = {
      label: item.region,
      color: getChartColor(index, 'secondary'),
    };
    return acc;
  }, {} as any);

  // Custom Tooltip Renderer
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
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

  // Custom Label Renderer
  const renderLabel = (entry: any) => {
    if (entry.percentage > 5) { // Nur Labels für größere Segmente anzeigen
      return formatPercentage(entry.percentage);
    }
    return '';
  };

  // Regionen-Icons (einfache Text-Abkürzungen)
  const getRegionFlag = (region: string) => {
    const flags: { [key: string]: string } = {
      'Deutschland': '🇩🇪',
      'Europa': '🇪🇺',
      'Nordamerika': '🇺🇸',
      'USA': '🇺🇸',
      'Asien': '🌏',
      'Japan': '🇯🇵',
      'China': '🇨🇳',
      'Emerging Markets': '🌍',
      'Schwellenländer': '🌍',
      'Global': '🌍',
      'Weltweit': '🌍',
      'Andere': '🌐',
    };
    
    // Suche nach passender Region (case-insensitive)
    const matchedRegion = Object.keys(flags).find(key => 
      region.toLowerCase().includes(key.toLowerCase())
    );
    
    return matchedRegion ? flags[matchedRegion] : '🌐';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Geografische Verteilung</CardTitle>
        {totalValue && (
          <div className="text-sm text-muted-foreground">
            Gesamtwert: {formatCurrency(totalValue)}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              stroke="#fff"
              strokeWidth={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              content={({ payload }) => (
                <div className="flex flex-wrap gap-4 justify-center mt-4">
                  {payload?.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm">{entry.value}</span>
                    </div>
                  ))}
                </div>
              )}
            />
          </PieChart>
        </ChartContainer>
        
        {/* Aufklappbare Tabellenansicht */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left py-2 w-8"></th>
                <th className="text-left py-2">Region</th>
                <th className="text-right py-2">Wert</th>
                <th className="text-right py-2">Anteil</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <>
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-2">
                      {item.assignedPositions && item.assignedPositions.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpansion(item.region)}
                          className="h-6 w-6 p-0"
                        >
                          {expandedRows.has(item.region) ? (
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
                        style={{ backgroundColor: getChartColor(index, 'secondary') }}
                      />
                      <span className="text-base mr-1">{getRegionFlag(item.region)}</span>
                      {item.region}
                    </td>
                    <td className="text-right py-2">{formatCurrency(item.value)}</td>
                    <td className="text-right py-2">{formatPercentage(item.percentage)}</td>
                  </tr>
                  
                  {/* Aufgeklappte Position-Details */}
                  {item.assignedPositions && item.assignedPositions.length > 0 && expandedRows.has(item.region) && (
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