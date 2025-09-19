import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  PlayCircle,
  PauseCircle,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';

interface TradeExecutionProps {
  optimizationResult: {
    tradeProposals: Array<{
      name: string;
      action: 'buy' | 'sell' | 'hold';
      amount: number;
      percentage: number;
      reasoning: string;
      priority: 'high' | 'medium' | 'low';
      estimatedCosts: number;
    }>;
  };
  portfolioId: string;
  onComplete: () => void;
}

interface ExecutionStatus {
  status: 'pending' | 'executing' | 'completed' | 'failed';
  message?: string;
  executedAt?: string;
}

export function TradeExecution({ optimizationResult, portfolioId, onComplete }: TradeExecutionProps) {
  const [selectedTrades, setSelectedTrades] = useState<Set<number>>(
    new Set(optimizationResult.tradeProposals.map((_, index) => index))
  );
  const [executionStatuses, setExecutionStatuses] = useState<Record<number, ExecutionStatus>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);

  const queryClient = useQueryClient();

  const executeTradeMutation = useMutation({
    mutationFn: async (tradeIndices: number[]) => {
      const selectedTradeProposals = tradeIndices.map(index => optimizationResult.tradeProposals[index]);

      const response = await fetch(`/api/portfolios/${portfolioId}/liquidity/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeProposals: selectedTradeProposals
        })
      });

      if (!response.ok) {
        throw new Error('Ausführung fehlgeschlagen');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', portfolioId] });
    }
  });

  const toggleTradeSelection = (index: number) => {
    const newSelection = new Set(selectedTrades);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedTrades(newSelection);
  };

  const selectAllTrades = () => {
    setSelectedTrades(new Set(optimizationResult.tradeProposals.map((_, index) => index)));
  };

  const selectNone = () => {
    setSelectedTrades(new Set());
  };

  const selectByPriority = (priority: 'high' | 'medium' | 'low') => {
    const indices = optimizationResult.tradeProposals
      .map((trade, index) => trade.priority === priority ? index : -1)
      .filter(index => index !== -1);
    setSelectedTrades(new Set(indices));
  };

  const executeSelectedTrades = async () => {
    if (selectedTrades.size === 0) return;

    setIsExecuting(true);
    setExecutionProgress(0);

    const tradeIndices = Array.from(selectedTrades);

    // Simuliere schrittweise Ausführung
    for (let i = 0; i < tradeIndices.length; i++) {
      const tradeIndex = tradeIndices[i];

      setExecutionStatuses(prev => ({
        ...prev,
        [tradeIndex]: { status: 'executing' }
      }));

      try {
        // Simuliere Ausführungszeit
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

        // In einer echten Implementierung würde hier der einzelne Trade ausgeführt
        setExecutionStatuses(prev => ({
          ...prev,
          [tradeIndex]: {
            status: 'completed',
            message: 'Erfolgreich ausgeführt',
            executedAt: new Date().toISOString()
          }
        }));
      } catch (error) {
        setExecutionStatuses(prev => ({
          ...prev,
          [tradeIndex]: {
            status: 'failed',
            message: 'Ausführung fehlgeschlagen'
          }
        }));
      }

      setExecutionProgress(((i + 1) / tradeIndices.length) * 100);
    }

    // Nach erfolgreicher Ausführung die Backend-API aufrufen
    try {
      await executeTradeMutation.mutateAsync(tradeIndices);
    } catch (error) {
      console.error('Backend-Update fehlgeschlagen:', error);
    }

    setIsExecuting(false);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'buy': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'sell': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <DollarSign className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusIcon = (status?: ExecutionStatus) => {
    if (!status || status.status === 'pending') return <Clock className="h-4 w-4 text-gray-400" />;
    if (status.status === 'executing') return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
    if (status.status === 'completed') return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (status.status === 'failed') return <AlertTriangle className="h-4 w-4 text-red-600" />;
    return null;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (value: number) => `€${value.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`;
  const formatPercentage = (value: number) => `${(value * 100).toFixed(2)}%`;

  const selectedTradesList = Array.from(selectedTrades).map(index => optimizationResult.tradeProposals[index]);
  const totalSelectedAmount = selectedTradesList.reduce((sum, trade) => sum + Math.abs(trade.amount), 0);
  const totalSelectedCosts = selectedTradesList.reduce((sum, trade) => sum + trade.estimatedCosts, 0);

  const completedTrades = Object.values(executionStatuses).filter(status => status.status === 'completed').length;
  const allTradesCompleted = selectedTrades.size > 0 && completedTrades === selectedTrades.size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Trade-Ausführung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Ausgewählte Trades</div>
              <div className="text-2xl font-bold">{selectedTrades.size}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Gesamtvolumen</div>
              <div className="text-2xl font-bold">{formatCurrency(totalSelectedAmount)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Geschätzte Kosten</div>
              <div className="text-2xl font-bold">{formatCurrency(totalSelectedCosts)}</div>
            </div>
          </div>

          {isExecuting && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Ausführung läuft...</span>
                <span className="text-sm text-gray-600">
                  {completedTrades} von {selectedTrades.size} abgeschlossen
                </span>
              </div>
              <Progress value={executionProgress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trade Selection Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trade-Auswahl</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={selectAllTrades}>
              Alle auswählen
            </Button>
            <Button variant="outline" size="sm" onClick={selectNone}>
              Keine auswählen
            </Button>
            <Button variant="outline" size="sm" onClick={() => selectByPriority('high')}>
              Nur hohe Priorität
            </Button>
            <Button variant="outline" size="sm" onClick={() => selectByPriority('medium')}>
              Nur mittlere Priorität
            </Button>
            <Button variant="outline" size="sm" onClick={() => selectByPriority('low')}>
              Nur niedrige Priorität
            </Button>
          </div>

          {selectedTrades.size === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Bitte wählen Sie mindestens einen Trade für die Ausführung aus.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Trade List */}
      <div className="space-y-3">
        {optimizationResult.tradeProposals.map((trade, index) => {
          const isSelected = selectedTrades.has(index);
          const status = executionStatuses[index];

          return (
            <Card key={index} className={`${isSelected ? 'ring-2 ring-blue-500' : ''} ${status?.status === 'completed' ? 'bg-green-50' : ''}`}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleTradeSelection(index)}
                    disabled={isExecuting}
                  />

                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getActionIcon(trade.action)}
                        <div>
                          <h4 className="font-medium">{trade.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{trade.reasoning}</p>
                          {status?.message && (
                            <p className={`text-sm mt-1 ${status.status === 'failed' ? 'text-red-600' : 'text-green-600'}`}>
                              {status.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(trade.priority)}>
                            {trade.priority}
                          </Badge>
                          {getStatusIcon(status)}
                        </div>
                        <div className="text-sm">
                          <div className="font-medium">{formatCurrency(trade.amount)}</div>
                          <div className="text-gray-500">{formatPercentage(trade.percentage)}</div>
                          <div className="text-xs text-gray-500">
                            Kosten: {formatCurrency(trade.estimatedCosts)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Button>

        <div className="flex gap-2">
          {allTradesCompleted ? (
            <Button
              onClick={onComplete}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Abschließen
            </Button>
          ) : (
            <Button
              onClick={executeSelectedTrades}
              disabled={selectedTrades.size === 0 || isExecuting}
              className="flex items-center gap-2"
            >
              {isExecuting ? (
                <>
                  <PauseCircle className="h-4 w-4" />
                  Wird ausgeführt...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" />
                  Ausgewählte Trades ausführen
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}