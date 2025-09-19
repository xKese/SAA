import { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Plus, Trash2, Play, Eye, TrendingUp, TrendingDown, Minus, ArrowRight, MessageCircle, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface PortfolioComparisonPanelProps {
  portfolioId: string;
  chatChangeRequest?: any; // Change request from chat
  onClearChatRequest?: () => void;
}

interface PortfolioChange {
  instrumentName: string;
  isin?: string;
  currentValue?: number;
  newValue: number;
  changeAmount: number;
  instrumentType?: string;
}

interface Scenario {
  scenarioId: string;
  scenarioName: string;
  description?: string;
  createdAt: string;
  totalValue: number;
  positionCount: number;
  changeType: string;
}

interface ComparisonResult {
  portfolioId: string;
  scenarioId: string;
  scenarioName: string;
  analysisDate: string;
  totalValueBefore: number;
  totalValueAfter: number;
  totalChangeAmount: number;
  comparison: any;
}

export default function PortfolioComparisonPanel({ portfolioId, chatChangeRequest, onClearChatRequest }: PortfolioComparisonPanelProps) {
  const [changes, setChanges] = useState<PortfolioChange[]>([]);
  const [scenarioName, setScenarioName] = useState('');
  const [changeType, setChangeType] = useState<'buy' | 'sell' | 'rebalance' | 'swap'>('buy');
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [activeTab, setActiveTab] = useState('create');

  // Effect to handle chat change request
  useEffect(() => {
    if (chatChangeRequest) {
      setActiveTab('chat');
      setScenarioName(chatChangeRequest.scenarioName || `Chat-Vorschlag ${new Date().toLocaleTimeString('de-DE')}`);
      setChangeType(chatChangeRequest.changeType || 'buy');
      if (chatChangeRequest.changes) {
        setChanges(chatChangeRequest.changes);
      }
    }
  }, [chatChangeRequest]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing scenarios
  const { data: scenarios = [], isLoading: scenariosLoading } = useQuery<Scenario[]>({
    queryKey: [`/api/portfolios/${portfolioId}/scenarios`],
    enabled: !!portfolioId,
    select: (data: any) => data?.data || [],
  });

  // Fetch current portfolio positions for reference
  const { data: positions = [] } = useQuery({
    queryKey: [`/api/portfolios/${portfolioId}/positions`],
    enabled: !!portfolioId,
    select: (data: any) => data?.data || [],
  });

  // Create scenario mutation
  const createScenarioMutation = useMutation({
    mutationFn: async ({ changeRequest, scenarioName }: { changeRequest: any; scenarioName: string }) => {
      const response = await fetch(`/api/portfolios/${portfolioId}/scenarios/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeRequest, scenarioName }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Szenario erstellt',
        description: `Portfolio-Szenario "${data.data.scenarioName}" wurde erfolgreich erstellt.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/portfolios/${portfolioId}/scenarios`] });
      setActiveTab('compare');
      setSelectedScenario(data.data.scenarioId);
    },
    onError: (error: any) => {
      toast({
        title: 'Fehler beim Erstellen',
        description: 'Das Portfolio-Szenario konnte nicht erstellt werden.',
        variant: 'destructive',
      });
    },
  });

  // Compare portfolios mutation
  const comparePortfoliosMutation = useMutation({
    mutationFn: async (scenarioId: string) => {
      const response = await fetch(`/api/portfolios/${portfolioId}/compare/${scenarioId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeRiskMetrics: true, includeCompliance: true }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: (data) => {
      setComparisonResult(data.data);
      setActiveTab('results');
      toast({
        title: 'Vergleich erstellt',
        description: 'Portfolio-Vergleichsanalyse wurde erfolgreich abgeschlossen.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Vergleichsfehler',
        description: 'Der Portfolio-Vergleich konnte nicht durchgeführt werden.',
        variant: 'destructive',
      });
    },
  });

  // Quick preview mutation
  const previewMutation = useMutation({
    mutationFn: async (changes: PortfolioChange[]) => {
      const response = await fetch(`/api/portfolios/${portfolioId}/compare/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes, scenarioName: 'Quick Preview' }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: (data) => {
      setComparisonResult(data.data.comparison);
      setActiveTab('results');
      toast({
        title: 'Vorschau erstellt',
        description: 'Schnelle Vorschau des Portfolio-Vergleichs erstellt.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Vorschau-Fehler',
        description: 'Die Portfolio-Vorschau konnte nicht erstellt werden.',
        variant: 'destructive',
      });
    },
  });

  const addChange = useCallback(() => {
    setChanges(prev => [...prev, {
      instrumentName: '',
      isin: '',
      currentValue: 0,
      newValue: 0,
      changeAmount: 0,
      instrumentType: 'ETF'
    }]);
  }, []);

  const removeChange = useCallback((index: number) => {
    setChanges(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateChange = useCallback((index: number, field: keyof PortfolioChange, value: any) => {
    setChanges(prev => prev.map((change, i) => {
      if (i === index) {
        const updated = { ...change, [field]: value };
        
        // Auto-calculate change amount when current and new values change
        if (field === 'currentValue' || field === 'newValue') {
          updated.changeAmount = (updated.newValue || 0) - (updated.currentValue || 0);
        }
        
        return updated;
      }
      return change;
    }));
  }, []);

  const createScenario = useCallback(() => {
    if (!scenarioName.trim()) {
      toast({
        title: 'Szenario-Name erforderlich',
        description: 'Bitte geben Sie einen Namen für das Szenario ein.',
        variant: 'destructive',
      });
      return;
    }

    if (changes.length === 0) {
      toast({
        title: 'Keine Änderungen',
        description: 'Bitte fügen Sie mindestens eine Portfolio-Änderung hinzu.',
        variant: 'destructive',
      });
      return;
    }

    const changeRequest = {
      changeType,
      changes: changes.filter(c => c.instrumentName.trim() && c.changeAmount !== 0),
      scenarioName,
      analysisDate: new Date().toISOString()
    };

    createScenarioMutation.mutate({ changeRequest, scenarioName });
  }, [scenarioName, changes, changeType, createScenarioMutation, toast]);

  const runComparison = useCallback(() => {
    if (!selectedScenario) {
      toast({
        title: 'Kein Szenario ausgewählt',
        description: 'Bitte wählen Sie ein Szenario für den Vergleich aus.',
        variant: 'destructive',
      });
      return;
    }

    comparePortfoliosMutation.mutate(selectedScenario);
  }, [selectedScenario, comparePortfoliosMutation, toast]);

  const quickPreview = useCallback(() => {
    if (changes.length === 0 || changes.every(c => c.changeAmount === 0)) {
      toast({
        title: 'Keine Änderungen für Vorschau',
        description: 'Bitte definieren Sie Portfolio-Änderungen für die Vorschau.',
        variant: 'destructive',
      });
      return;
    }

    const validChanges = changes.filter(c => c.instrumentName.trim() && c.changeAmount !== 0);
    previewMutation.mutate(validChanges);
  }, [changes, previewMutation, toast]);

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  const formatPercentage = useCallback((value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
  }, []);

  const getChangeIcon = useCallback((change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  }, []);

  const getChangeColor = useCallback((change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-ms-blue" />
          Portfolio-Vergleich (Vorher-Nachher)
        </CardTitle>
        <p className="text-sm text-gray-600">
          Simulieren Sie Portfolio-Änderungen und analysieren Sie deren Auswirkungen mit Claude AI-Unterstützung.
        </p>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="create">Szenario erstellen</TabsTrigger>
            <TabsTrigger value="chat" className={chatChangeRequest ? "bg-blue-50 border-blue-200" : ""}>
              Chat-Vorschlag
              {chatChangeRequest && (
                <Badge className="ml-1 bg-blue-500 text-white text-xs">Neu</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="compare">Vergleichen</TabsTrigger>
            <TabsTrigger value="results">Ergebnisse</TabsTrigger>
          </TabsList>

          {/* Create Scenario Tab */}
          <TabsContent value="create" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scenario-name">Szenario-Name</Label>
                <Input
                  id="scenario-name"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="z.B. Erhöhung Aktienanteil Q1 2025"
                />
              </div>
              <div>
                <Label htmlFor="change-type">Änderungstyp</Label>
                <Select value={changeType} onValueChange={(value: any) => setChangeType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Kauf</SelectItem>
                    <SelectItem value="sell">Verkauf</SelectItem>
                    <SelectItem value="rebalance">Reallokation</SelectItem>
                    <SelectItem value="swap">Umschichtung</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Portfolio-Änderungen</Label>
                <Button onClick={addChange} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Änderung hinzufügen
                </Button>
              </div>
              
              <div className="space-y-3">
                {changes.map((change, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
                      <div className="md:col-span-2">
                        <Label className="text-xs">Instrumentenname</Label>
                        <Input
                          value={change.instrumentName}
                          onChange={(e) => updateChange(index, 'instrumentName', e.target.value)}
                          placeholder="z.B. MSCI World ETF"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">ISIN (optional)</Label>
                        <Input
                          value={change.isin || ''}
                          onChange={(e) => updateChange(index, 'isin', e.target.value)}
                          placeholder="z.B. IE00B4L5Y983"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Aktueller Wert</Label>
                        <Input
                          type="number"
                          value={change.currentValue || 0}
                          onChange={(e) => updateChange(index, 'currentValue', parseFloat(e.target.value) || 0)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Neuer Wert</Label>
                        <Input
                          type="number"
                          value={change.newValue}
                          onChange={(e) => updateChange(index, 'newValue', parseFloat(e.target.value) || 0)}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm">
                          <div className="text-xs text-gray-600 mb-1">Änderung</div>
                          <div className={`font-medium ${getChangeColor(change.changeAmount)}`}>
                            {getChangeIcon(change.changeAmount)}
                            <span className="ml-1">{formatCurrency(change.changeAmount)}</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => removeChange(index)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                
                {changes.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                    <p>Keine Portfolio-Änderungen definiert</p>
                    <p className="text-sm">Klicken Sie auf "Änderung hinzufügen" um zu beginnen.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={createScenario}
                disabled={createScenarioMutation.isPending}
                className="bg-ms-green hover:bg-ms-green/90"
              >
                {createScenarioMutation.isPending ? 'Erstelle...' : 'Szenario erstellen'}
              </Button>
              <Button
                onClick={quickPreview}
                variant="outline"
                disabled={previewMutation.isPending}
              >
                <Eye className="w-4 h-4 mr-1" />
                {previewMutation.isPending ? 'Generiere...' : 'Schnelle Vorschau'}
              </Button>
            </div>
          </TabsContent>

          {/* Chat Suggestion Tab */}
          <TabsContent value="chat" className="space-y-6">
            {chatChangeRequest ? (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-2">
                        💬 Vorschlag aus dem Chat-Gespräch
                      </h3>
                      <p className="text-blue-700 text-sm mb-3">
                        Claude hat basierend auf Ihrem Chat-Gespräch diese Portfolio-Änderungen vorgeschlagen:
                      </p>
                      
                      <div className="space-y-2">
                        <div className="text-sm">
                          <strong>Änderungstyp:</strong> {changeType}
                        </div>
                        <div className="text-sm">
                          <strong>Szenario-Name:</strong> {scenarioName}
                        </div>
                        {chatChangeRequest.reasoning && (
                          <div className="text-sm">
                            <strong>Begründung:</strong> {chatChangeRequest.reasoning}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {onClearChatRequest && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearChatRequest}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Vorgeschlagene Änderungen anzeigen */}
                <div>
                  <Label className="text-base font-medium">Vorgeschlagene Portfolio-Änderungen</Label>
                  <div className="mt-3 space-y-2">
                    {changes.map((change, index) => (
                      <Card key={index} className="p-3 bg-gray-50">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{change.instrumentName}</div>
                            {change.isin && (
                              <div className="text-sm text-gray-600">ISIN: {change.isin}</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className={`font-semibold ${getChangeColor(change.changeAmount)}`}>
                              {getChangeIcon(change.changeAmount)}
                              €{Math.abs(change.changeAmount).toLocaleString('de-DE')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {change.changeAmount > 0 ? 'Kauf' : 'Verkauf'}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Aktions-Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={createScenario}
                    disabled={createScenarioMutation.isPending}
                    className="bg-ms-green hover:bg-ms-green/90"
                  >
                    {createScenarioMutation.isPending ? 'Erstelle...' : 'Chat-Szenario erstellen'}
                  </Button>
                  <Button
                    onClick={quickPreview}
                    variant="outline"
                    disabled={previewMutation.isPending}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    {previewMutation.isPending ? 'Generiere...' : 'Vorschau generieren'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="w-8 h-8 mx-auto mb-2" />
                <p>Keine Chat-Vorschläge verfügbar</p>
                <p className="text-sm">Starten Sie einen Chat und lassen Sie sich Portfolio-Änderungen vorschlagen.</p>
              </div>
            )}
          </TabsContent>

          {/* Compare Tab */}
          <TabsContent value="compare" className="space-y-4">
            <div>
              <Label>Vorhandene Szenarien</Label>
              <div className="mt-2 space-y-2">
                {scenariosLoading ? (
                  <div className="text-center py-4">Lade Szenarien...</div>
                ) : scenarios.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                    <p>Keine Szenarien vorhanden</p>
                    <p className="text-sm">Erstellen Sie zuerst ein Szenario im ersten Tab.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {scenarios.map((scenario) => (
                      <Card
                        key={scenario.scenarioId}
                        className={`cursor-pointer transition-colors ${
                          selectedScenario === scenario.scenarioId
                            ? 'border-ms-blue bg-blue-50'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedScenario(scenario.scenarioId)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{scenario.scenarioName}</h4>
                              <p className="text-sm text-gray-600 mt-1">{scenario.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <span>Wert: {formatCurrency(scenario.totalValue)}</span>
                                <span>Positionen: {scenario.positionCount}</span>
                                <span>Typ: {scenario.changeType}</span>
                              </div>
                            </div>
                            <div className="text-right text-sm text-gray-500">
                              <div>{new Date(scenario.createdAt).toLocaleDateString('de-DE')}</div>
                              {selectedScenario === scenario.scenarioId && (
                                <Badge className="mt-1">Ausgewählt</Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedScenario && (
              <Button
                onClick={runComparison}
                disabled={comparePortfoliosMutation.isPending}
                className="w-full bg-ms-blue hover:bg-ms-blue/90"
              >
                <Play className="w-4 h-4 mr-2" />
                {comparePortfoliosMutation.isPending ? 'Vergleiche...' : 'Vergleich durchführen'}
              </Button>
            )}
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results">
            {comparisonResult ? (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-600 mb-1">Ursprünglicher Wert</div>
                      <div className="text-2xl font-bold text-ms-green">
                        {formatCurrency(comparisonResult.totalValueBefore)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-600 mb-1">Neuer Wert</div>
                      <div className="text-2xl font-bold text-ms-blue">
                        {formatCurrency(comparisonResult.totalValueAfter)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-600 mb-1">Änderung</div>
                      <div className={`text-2xl font-bold ${getChangeColor(comparisonResult.totalChangeAmount)}`}>
                        {getChangeIcon(comparisonResult.totalChangeAmount)}
                        <span className="ml-1">{formatCurrency(Math.abs(comparisonResult.totalChangeAmount))}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {formatPercentage((comparisonResult.totalChangeAmount / comparisonResult.totalValueBefore) * 100)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Analysis Summary */}
                {comparisonResult.comparison?.summary && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Zusammenfassung der Änderungen</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {comparisonResult.comparison.summary.mainChanges?.map((change: string, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            <ArrowRight className="w-4 h-4 text-ms-blue" />
                            <span>{change}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">Risiko-Auswirkung</div>
                          <Badge 
                            variant={comparisonResult.comparison.summary.riskImpact === 'lower' ? 'secondary' : 
                                    comparisonResult.comparison.summary.riskImpact === 'higher' ? 'destructive' : 'default'}
                          >
                            {comparisonResult.comparison.summary.riskImpact === 'lower' ? 'Niedriger' :
                             comparisonResult.comparison.summary.riskImpact === 'higher' ? 'Höher' : 'Ähnlich'}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">Diversifikation</div>
                          <Badge 
                            variant={comparisonResult.comparison.summary.diversificationImpact === 'improved' ? 'secondary' : 
                                    comparisonResult.comparison.summary.diversificationImpact === 'reduced' ? 'destructive' : 'default'}
                          >
                            {comparisonResult.comparison.summary.diversificationImpact === 'improved' ? 'Verbessert' :
                             comparisonResult.comparison.summary.diversificationImpact === 'reduced' ? 'Reduziert' : 'Unverändert'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Asset Allocation Comparison */}
                {comparisonResult.comparison?.assetAllocationComparison && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Asset-Allokation Vergleich</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {comparisonResult.comparison.assetAllocationComparison.map((item: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="font-medium">{item.category}</div>
                            <div className="flex items-center gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Vorher: </span>
                                <span>{formatPercentage(item.beforePercentage)}</span>
                              </div>
                              <ArrowRight className="w-4 h-4 text-gray-400" />
                              <div>
                                <span className="text-gray-600">Nachher: </span>
                                <span>{formatPercentage(item.afterPercentage)}</span>
                              </div>
                              <div className={getChangeColor(item.percentageChange)}>
                                {getChangeIcon(item.percentageChange)}
                                <span className="ml-1">{formatPercentage(Math.abs(item.percentageChange))}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Claude AI Analysis Note */}
                <Card className="border-ms-green">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-ms-green">Claude AI Analyse</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Diese Vergleichsanalyse wurde vom einheitlichen Claude AI-Service erstellt und berücksichtigt 
                      deutsche Banking-Standards sowie BaFin-konforme Bewertungen. Alle Berechnungen erfolgen 
                      durch die zentrale KI-Instanz für konsistente und präzise Ergebnisse.
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>Keine Vergleichsergebnisse verfügbar</p>
                <p className="text-sm">Führen Sie zuerst einen Portfolio-Vergleich durch.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}