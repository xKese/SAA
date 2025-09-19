import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Calculator,
  DollarSign,
  AlertTriangle,
  Target,
  Info
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface RebalancingMatrixProps {
  portfolioId: string;
  thresholds: {
    deviation: number;
    minTradeSize: number;
    maxCosts: number;
  };
  targetAllocation?: Record<string, number>;
  onTradeSelect?: (trades: TradeProposal[]) => void;
}

interface Position {
  id: string;
  instrumentName: string;
  isin?: string;
  currentValue: number;
  currentWeight: number;
  targetWeight: number;
  deviation: number;
  assetClass: string;
  currency: string;
  liquidity: 'high' | 'medium' | 'low';
  tradingCost: number;
  minTradeSize: number;
}

interface TradeProposal {
  positionId: string;
  instrumentName: string;
  action: 'buy' | 'sell' | 'hold';
  currentValue: number;
  targetValue: number;
  tradeAmount: number;
  tradingCosts: number;
  priority: 'high' | 'medium' | 'low';
  selected: boolean;
  marketImpact: number;
  liquidityScore: number;
}

interface RebalancingStats {
  totalTradingVolume: number;
  totalCosts: number;
  numberOfTrades: number;
  averageDeviation: number;
  maxDeviation: number;
  estimatedDuration: string;
}

export function RebalancingMatrix({ portfolioId, thresholds, targetAllocation, onTradeSelect }: RebalancingMatrixProps) {
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'deviation' | 'value' | 'cost'>('deviation');
  const [filterBy, setFilterBy] = useState<'all' | 'buy' | 'sell' | 'significant'>('significant');
  const [gridApi, setGridApi] = useState<any>(null);

  // Fetch portfolio data and calculate rebalancing needs
  const { data: portfolioData, isLoading } = useQuery({
    queryKey: ['portfolio-rebalancing', portfolioId, thresholds],
    queryFn: async () => {
      const response = await fetch(`/api/portfolios/${portfolioId}/rebalancing-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thresholds, targetAllocation })
      });
      if (!response.ok) throw new Error('Failed to fetch rebalancing analysis');
      return response.json();
    },
    enabled: !!portfolioId
  });

  const positions: Position[] = portfolioData?.positions || [];
  const tradeProposals: TradeProposal[] = portfolioData?.tradeProposals || [];
  const stats: RebalancingStats = portfolioData?.stats || {
    totalTradingVolume: 0,
    totalCosts: 0,
    numberOfTrades: 0,
    averageDeviation: 0,
    maxDeviation: 0,
    estimatedDuration: '0 minutes'
  };

  // Filter trade proposals based on current filter
  const filteredTrades = useMemo(() => {
    let filtered = tradeProposals;

    switch (filterBy) {
      case 'buy':
        filtered = filtered.filter(trade => trade.action === 'buy');
        break;
      case 'sell':
        filtered = filtered.filter(trade => trade.action === 'sell');
        break;
      case 'significant':
        filtered = filtered.filter(trade =>
          Math.abs(trade.tradeAmount) >= thresholds.minTradeSize
        );
        break;
    }

    // Sort by selected criteria
    switch (sortBy) {
      case 'deviation':
        filtered.sort((a, b) => Math.abs(b.targetValue - b.currentValue) - Math.abs(a.targetValue - a.currentValue));
        break;
      case 'value':
        filtered.sort((a, b) => Math.abs(b.tradeAmount) - Math.abs(a.tradeAmount));
        break;
      case 'cost':
        filtered.sort((a, b) => b.tradingCosts - a.tradingCosts);
        break;
    }

    return filtered;
  }, [tradeProposals, filterBy, sortBy, thresholds.minTradeSize]);

  // AG-Grid column definitions
  const columnDefs: ColDef[] = [
    {
      headerName: '',
      field: 'selected',
      width: 50,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      cellRenderer: 'agCheckboxCellRenderer'
    },
    {
      headerName: 'Instrument',
      field: 'instrumentName',
      width: 200,
      pinned: 'left',
      cellRenderer: (params: any) => (
        <div>
          <div className="font-medium">{params.value}</div>
          <div className="text-xs text-gray-500">{params.data.isin}</div>
        </div>
      )
    },
    {
      headerName: 'Aktion',
      field: 'action',
      width: 80,
      cellRenderer: (params: any) => {
        const action = params.value;
        const icon = action === 'buy' ? <TrendingUp className="h-4 w-4" /> :
                     action === 'sell' ? <TrendingDown className="h-4 w-4" /> :
                     <ArrowUpDown className="h-4 w-4" />;
        const color = action === 'buy' ? 'text-green-600' :
                      action === 'sell' ? 'text-red-600' : 'text-gray-600';

        return (
          <div className={`flex items-center gap-1 ${color}`}>
            {icon}
            <span className="capitalize">{action}</span>
          </div>
        );
      }
    },
    {
      headerName: 'Aktueller Wert',
      field: 'currentValue',
      width: 120,
      type: 'numericColumn',
      valueFormatter: (params: any) => `€${params.value?.toLocaleString()}`
    },
    {
      headerName: 'Zielwert',
      field: 'targetValue',
      width: 120,
      type: 'numericColumn',
      valueFormatter: (params: any) => `€${params.value?.toLocaleString()}`
    },
    {
      headerName: 'Trade-Betrag',
      field: 'tradeAmount',
      width: 120,
      type: 'numericColumn',
      cellRenderer: (params: any) => {
        const value = params.value;
        const color = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-600';
        return (
          <span className={color}>
            {value > 0 ? '+' : ''}€{Math.abs(value).toLocaleString()}
          </span>
        );
      }
    },
    {
      headerName: 'Abweichung',
      field: 'deviation',
      width: 100,
      type: 'numericColumn',
      cellRenderer: (params: any) => {
        const deviation = ((params.data.targetValue - params.data.currentValue) / params.data.currentValue * 100);
        const color = Math.abs(deviation) > thresholds.deviation ? 'text-red-600' : 'text-yellow-600';
        return (
          <span className={color}>
            {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
          </span>
        );
      }
    },
    {
      headerName: 'Priorität',
      field: 'priority',
      width: 100,
      cellRenderer: (params: any) => {
        const priority = params.value;
        const color = priority === 'high' ? 'bg-red-100 text-red-800' :
                      priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800';
        return <Badge className={color}>{priority}</Badge>;
      }
    },
    {
      headerName: 'Trading Kosten',
      field: 'tradingCosts',
      width: 120,
      type: 'numericColumn',
      valueFormatter: (params: any) => `€${params.value?.toFixed(2)}`
    },
    {
      headerName: 'Liquidität',
      field: 'liquidityScore',
      width: 100,
      cellRenderer: (params: any) => {
        const score = params.value;
        const color = score > 7 ? 'text-green-600' : score > 4 ? 'text-yellow-600' : 'text-red-600';
        return <span className={color}>{score}/10</span>;
      }
    },
    {
      headerName: 'Market Impact',
      field: 'marketImpact',
      width: 120,
      type: 'numericColumn',
      cellRenderer: (params: any) => {
        const impact = params.value;
        const color = impact > 0.5 ? 'text-red-600' : impact > 0.2 ? 'text-yellow-600' : 'text-green-600';
        return <span className={color}>{impact.toFixed(2)}%</span>;
      }
    }
  ];

  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);
  };

  const onSelectionChanged = () => {
    if (gridApi) {
      const selectedRows = gridApi.getSelectedRows();
      setSelectedTrades(selectedRows.map((row: TradeProposal) => row.positionId));
      onTradeSelect?.(selectedRows);
    }
  };

  const selectAllSignificantTrades = () => {
    const significantTrades = filteredTrades.filter(trade =>
      Math.abs(trade.tradeAmount) >= thresholds.minTradeSize
    );
    gridApi?.forEachNode((node: any) => {
      if (significantTrades.some(trade => trade.positionId === node.data.positionId)) {
        node.setSelected(true);
      }
    });
  };

  const selectOptimalTrades = () => {
    // Select trades that maximize efficiency (high deviation, low cost, high liquidity)
    const optimalTrades = filteredTrades
      .map(trade => ({
        ...trade,
        efficiency: Math.abs(trade.tradeAmount) / (trade.tradingCosts + 1) * trade.liquidityScore
      }))
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, Math.min(10, filteredTrades.length)); // Top 10 most efficient trades

    gridApi?.deselectAll();
    gridApi?.forEachNode((node: any) => {
      if (optimalTrades.some(trade => trade.positionId === node.data.positionId)) {
        node.setSelected(true);
      }
    });
  };

  const getSelectedStats = () => {
    const selected = filteredTrades.filter(trade => selectedTrades.includes(trade.positionId));
    return {
      count: selected.length,
      totalVolume: selected.reduce((sum, trade) => sum + Math.abs(trade.tradeAmount), 0),
      totalCosts: selected.reduce((sum, trade) => sum + trade.tradingCosts, 0),
      averageImpact: selected.length > 0 ?
        selected.reduce((sum, trade) => sum + trade.marketImpact, 0) / selected.length : 0
    };
  };

  const selectedStats = getSelectedStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-sm text-muted-foreground">Trades</div>
                <div className="font-bold">{stats.numberOfTrades}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-sm text-muted-foreground">Volumen</div>
                <div className="font-bold">€{stats.totalTradingVolume.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-sm text-muted-foreground">Kosten</div>
                <div className="font-bold">€{stats.totalCosts.toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              <div>
                <div className="text-sm text-muted-foreground">Max. Drift</div>
                <div className="font-bold">{stats.maxDeviation.toFixed(1)}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {stats.maxDeviation > thresholds.deviation && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Maximale Abweichung ({stats.maxDeviation.toFixed(1)}%) überschreitet Schwellenwert ({thresholds.deviation}%).
            Rebalancing wird empfohlen.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="matrix" className="space-y-4">
        <TabsList>
          <TabsTrigger value="matrix">Trade Matrix</TabsTrigger>
          <TabsTrigger value="analysis">Drift-Analyse</TabsTrigger>
          <TabsTrigger value="execution">Ausführungsplan</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="space-y-4">
          {/* Controls */}
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Trades</SelectItem>
                  <SelectItem value="buy">Nur Käufe</SelectItem>
                  <SelectItem value="sell">Nur Verkäufe</SelectItem>
                  <SelectItem value="significant">Signifikante Trades</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deviation">Nach Abweichung</SelectItem>
                  <SelectItem value="value">Nach Volumen</SelectItem>
                  <SelectItem value="cost">Nach Kosten</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllSignificantTrades}>
                Signifikante auswählen
              </Button>
              <Button variant="outline" size="sm" onClick={selectOptimalTrades}>
                Optimale auswählen
              </Button>
            </div>
          </div>

          {/* Selection Summary */}
          {selectedTrades.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Ausgewählt: </span>
                    <span className="font-medium">{selectedStats.count} Trades</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Volumen: </span>
                    <span className="font-medium">€{selectedStats.totalVolume.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Kosten: </span>
                    <span className="font-medium">€{selectedStats.totalCosts.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ø Impact: </span>
                    <span className="font-medium">{selectedStats.averageImpact.toFixed(2)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AG-Grid Table */}
          <Card>
            <CardContent className="p-0">
              <div className="ag-theme-alpine" style={{ height: 500, width: '100%' }}>
                <AgGridReact
                  rowData={filteredTrades}
                  columnDefs={columnDefs}
                  onGridReady={onGridReady}
                  onSelectionChanged={onSelectionChanged}
                  rowSelection="multiple"
                  suppressRowClickSelection={true}
                  defaultColDef={{
                    sortable: true,
                    filter: true,
                    resizable: true
                  }}
                  animateRows={true}
                  enableRangeSelection={true}
                  pagination={true}
                  paginationPageSize={20}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Drift-Analyse nach Asset-Klassen</CardTitle>
              <CardDescription>
                Abweichungen von der Ziel-Allokation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(targetAllocation || {}).map(([assetClass, target]) => {
                  const current = positions
                    .filter(p => p.assetClass === assetClass)
                    .reduce((sum, p) => sum + p.currentWeight, 0);
                  const drift = current - target;
                  const isDrifting = Math.abs(drift) > thresholds.deviation;

                  return (
                    <div key={assetClass} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            isDrifting ? 'bg-red-500' : 'bg-green-500'
                          }`}
                        />
                        <span className="font-medium">{assetClass}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span>Ist: {current.toFixed(1)}%</span>
                        <span>Ziel: {target.toFixed(1)}%</span>
                        <span className={`font-medium ${
                          isDrifting ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {drift > 0 ? '+' : ''}{drift.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="execution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ausführungsplan</CardTitle>
              <CardDescription>
                Optimale Reihenfolge für Trade-Ausführung
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Geschätzte Ausführungsdauer: {stats.estimatedDuration}
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="font-medium">Empfohlene Reihenfolge:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Verkäufe in übergewichteten Positionen (hohe Liquidität zuerst)</li>
                    <li>Käufe in untergewichteten Positionen (niedrige Market Impact)</li>
                    <li>Feinabstimmung kleinerer Positionen</li>
                    <li>Validierung der finalen Allokation</li>
                  </ol>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Beste Ausführungszeit:</span>
                    <div className="font-medium">Europäische Marktöffnung (09:00-11:00)</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Minimale Market Impact:</span>
                    <div className="font-medium">Aufträge in kleinen Blöcken splitten</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}