import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Trash2, Play, Eye, FileText } from "lucide-react";
import { AnalysisCharts } from "@/components/charts/AnalysisCharts";
import { TargetStructurePanel } from "@/components/common/TargetStructurePanel";
import { ReallocationAnalysisView } from "@/components/common/ReallocationAnalysisView";
import { FactsheetViewer } from "@/components/common/FactsheetViewer";
import { OptimizationControlPanel } from "@/components/optimization/OptimizationControlPanel";
import { PortfolioAnalysisResult } from "@/types/analysis";

interface Portfolio {
  id: string;
  name: string;
  fileName: string;
  totalValue: string;
  positionCount: number;
  analysisStatus: string;
  analysisResults?: PortfolioAnalysisResult;
  createdAt?: string;
}

interface Position {
  id: string;
  name: string;
  isin?: string;
  value: string;
  percentage: string;
  hasFactsheet?: boolean;
  factsheetFileName?: string;
  instrumentType?: string;
}

export default function PortfolioAnalyzer() {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("analysis");
  const [reallocationAnalysis, setReallokationAnalysis] = useState<any>(null);
  const [selectedFactsheet, setSelectedFactsheet] = useState<any>(null);
  const [isFactsheetViewerOpen, setIsFactsheetViewerOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all portfolios
  const { data: portfolios = [], isLoading } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolios"]
  });

  // Fetch positions for selected portfolio
  const { data: positions = [] } = useQuery<Position[]>({
    queryKey: [`/api/portfolios/${selectedPortfolioId}/positions`],
    enabled: !!selectedPortfolioId
  });

  // Query for investment universe to find factsheets for positions
  const { data: investmentUniverse } = useQuery({
    queryKey: ["/api/investment-universe", { limit: 10000 }],
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/portfolios/upload", {
        method: "POST",
        body: formData
      });
      
      if (!response.ok) throw new Error("Upload fehlgeschlagen");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Portfolio hochgeladen" });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
      setSelectedFile(null);
    },
    onError: () => {
      toast({ 
        title: "Fehler beim Upload",
        variant: "destructive" 
      });
    }
  });

  // Analyze mutation
  const analyzeMutation = useMutation({
    mutationFn: async (portfolioId: string) => {
      const response = await fetch(`/api/portfolios/${portfolioId}/analyze`, {
        method: "POST"
      });
      
      if (!response.ok) throw new Error("Analyse fehlgeschlagen");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Analyse abgeschlossen" });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
    },
    onError: () => {
      toast({ 
        title: "Fehler bei der Analyse",
        variant: "destructive" 
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (portfolioId: string) => {
      const response = await fetch(`/api/portfolios/${portfolioId}`, {
        method: "DELETE"
      });
      
      if (!response.ok) throw new Error("Löschen fehlgeschlagen");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Portfolio gelöscht" });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
      setSelectedPortfolioId(null);
    },
    onError: () => {
      toast({ 
        title: "Fehler beim Löschen",
        variant: "destructive" 
      });
    }
  });

  // Target structure mutation
  const saveTargetMutation = useMutation({
    mutationFn: async ({ portfolioId, targetStructure }: { portfolioId: string; targetStructure: any }) => {
      const response = await fetch(`/api/portfolios/${portfolioId}/targets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(targetStructure)
      });
      
      if (!response.ok) throw new Error("Speichern der Zielstruktur fehlgeschlagen");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Zielstruktur gespeichert" });
    },
    onError: () => {
      toast({ 
        title: "Fehler beim Speichern der Zielstruktur",
        variant: "destructive" 
      });
    }
  });

  // Reallokation analysis mutation
  const reallocationMutation = useMutation({
    mutationFn: async ({ portfolioId, targetStructure }: { portfolioId: string; targetStructure: any }) => {
      const response = await fetch(`/api/portfolios/${portfolioId}/reallocation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ targetStructure })
      });
      
      if (!response.ok) throw new Error("Reallokation-Analyse fehlgeschlagen");
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Reallokation-Analyse abgeschlossen" });
      setReallokationAnalysis(data);
      setActiveTab("reallocation");
    },
    onError: () => {
      toast({ 
        title: "Fehler bei der Reallokation-Analyse",
        variant: "destructive" 
      });
    }
  });

  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);

  // Enrich positions with factsheet information
  const enrichedPositions = positions.map(position => {
    if (!investmentUniverse?.instruments) return position;

    // Try to find matching instrument by ISIN or name
    const matchingInstrument = investmentUniverse.instruments.find(instrument =>
      (position.isin && instrument.isin === position.isin) ||
      (instrument.name.toLowerCase().includes(position.name.toLowerCase()) ||
       position.name.toLowerCase().includes(instrument.name.toLowerCase()))
    );

    return {
      ...position,
      hasFactsheet: matchingInstrument?.hasFactsheet || false,
      factsheetFileName: matchingInstrument?.fileName,
      instrumentType: matchingInstrument?.assetClass,
      confidence: matchingInstrument?.confidence
    };
  });

  // Handler functions
  const handleViewFactsheet = (position: any) => {
    if (!position.hasFactsheet) return;

    const instrument = {
      name: position.name,
      isin: position.isin,
      assetClass: position.instrumentType || 'Unknown',
      category: position.instrumentType || 'Unknown',
      factsheetPath: '',
      hasFactsheet: true,
      fileName: position.factsheetFileName,
      confidence: position.confidence || 1.0
    };

    setSelectedFactsheet(instrument);
    setIsFactsheetViewerOpen(true);
  };

  const handleTargetStructureSave = (targetStructure: any) => {
    if (!selectedPortfolioId) return;
    saveTargetMutation.mutate({ portfolioId: selectedPortfolioId, targetStructure });
  };

  const handleReallocationAnalysis = (targetStructure: any) => {
    if (!selectedPortfolioId) return;
    reallocationMutation.mutate({ portfolioId: selectedPortfolioId, targetStructure });
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Portfolio Analyzer (Neu)</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Portfolio List */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolios</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Upload Section */}
            <div className="mb-4 pb-4 border-b">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="mb-2"
              />
              <Button 
                onClick={() => selectedFile && uploadMutation.mutate(selectedFile)}
                disabled={!selectedFile || uploadMutation.isPending}
                className="w-full"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload CSV
              </Button>
            </div>

            {/* Portfolio List */}
            {isLoading ? (
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {portfolios.map((portfolio) => (
                  <div
                    key={portfolio.id}
                    className={`p-3 border rounded cursor-pointer ${
                      selectedPortfolioId === portfolio.id ? "bg-blue-50 border-blue-500" : ""
                    }`}
                    onClick={() => setSelectedPortfolioId(portfolio.id)}
                  >
                    <div className="font-medium">{portfolio.name}</div>
                    <div className="text-sm text-gray-500">
                      {portfolio.positionCount} Positionen
                    </div>
                    <div className="text-xs text-gray-400">
                      Status: {portfolio.analysisStatus}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Portfolio Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Portfolio Details</CardTitle>
              {selectedPortfolio && (
                <div className="space-x-2">
                  <Button
                    onClick={() => analyzeMutation.mutate(selectedPortfolioId!)}
                    disabled={analyzeMutation.isPending}
                    variant="outline"
                  >
                    {analyzeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Analysieren
                  </Button>
                  <Button
                    onClick={() => deleteMutation.mutate(selectedPortfolioId!)}
                    disabled={deleteMutation.isPending}
                    variant="destructive"
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Löschen
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedPortfolio ? (
              <p className="text-gray-500">Wählen Sie ein Portfolio aus</p>
            ) : (
              <div>
                {/* Portfolio Overview */}
                <div className="mb-6 p-4 bg-gray-50 rounded">
                  <h3 className="font-semibold mb-2">Übersicht</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">Name:</span>
                      <p className="font-medium">{selectedPortfolio.name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Gesamtwert:</span>
                      <p className="font-medium">
                        €{parseFloat(selectedPortfolio.totalValue).toLocaleString("de-DE")}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Positionen:</span>
                      <p className="font-medium">{selectedPortfolio.positionCount}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Status:</span>
                      <p className="font-medium">{selectedPortfolio.analysisStatus}</p>
                    </div>
                  </div>
                </div>

                {/* Tabbed Content */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="analysis">Analyse</TabsTrigger>
                    <TabsTrigger value="positions">Positionen</TabsTrigger>
                    <TabsTrigger value="targets">Zielstruktur</TabsTrigger>
                    <TabsTrigger value="optimization">Optimierung</TabsTrigger>
                    <TabsTrigger value="reallocation">Reallokation</TabsTrigger>
                  </TabsList>

                  <TabsContent value="analysis" className="space-y-4">
                    <AnalysisCharts 
                      analysisResults={selectedPortfolio.analysisResults}
                      totalValue={parseFloat(selectedPortfolio.totalValue)}
                      isLoading={analyzeMutation.isPending}
                    />

                    {/* Raw Analysis Results (entwicklungsmodus) */}
                    {process.env.NODE_ENV === 'development' && 
                     selectedPortfolio.analysisStatus === "completed" && 
                     selectedPortfolio.analysisResults && (
                      <details className="mt-6">
                        <summary className="font-semibold mb-2 cursor-pointer text-sm text-muted-foreground">
                          🔧 Rohe Analyse-Daten (Development Mode)
                        </summary>
                        <div className="p-4 bg-gray-50 rounded mt-2">
                          <pre className="text-xs whitespace-pre-wrap">
                            {JSON.stringify(selectedPortfolio.analysisResults, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                  </TabsContent>

                  <TabsContent value="positions" className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full border">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="border p-2 text-left">Name</th>
                            <th className="border p-2 text-left">ISIN</th>
                            <th className="border p-2 text-right">Wert (€)</th>
                            <th className="border p-2 text-right">Anteil (%)</th>
                            <th className="border p-2 text-center">Factsheet</th>
                            <th className="border p-2 text-center">Aktionen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {enrichedPositions.map((position) => (
                            <tr key={position.id}>
                              <td className="border p-2">
                                <div>
                                  <div className="font-medium">{position.name}</div>
                                  {position.instrumentType && (
                                    <div className="text-xs text-gray-500">
                                      {position.instrumentType}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="border p-2">
                                <code className="text-sm">{position.isin || "-"}</code>
                              </td>
                              <td className="border p-2 text-right">
                                {parseFloat(position.value).toLocaleString("de-DE")}
                              </td>
                              <td className="border p-2 text-right">
                                {parseFloat(position.percentage).toFixed(2)}%
                              </td>
                              <td className="border p-2 text-center">
                                {position.hasFactsheet ? (
                                  <div className="flex items-center justify-center gap-1 text-green-600">
                                    <FileText className="h-4 w-4" />
                                    <span className="text-xs">Verfügbar</span>
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-400">-</div>
                                )}
                              </td>
                              <td className="border p-2 text-center">
                                {position.hasFactsheet && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewFactsheet(position)}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  <TabsContent value="targets" className="space-y-4">
                    <TargetStructurePanel
                      portfolioId={selectedPortfolioId}
                      currentAnalysis={selectedPortfolio.analysisResults}
                      portfolioPositions={positions.map(pos => ({
                        name: pos.name,
                        isin: pos.isin || undefined,
                        value: parseFloat(pos.value),
                        percentage: parseFloat(pos.percentage)
                      }))}
                      onSave={handleTargetStructureSave}
                      onReallocationAnalysis={handleReallocationAnalysis}
                      isLoading={saveTargetMutation.isPending}
                      isAnalyzing={reallocationMutation.isPending}
                    />
                  </TabsContent>

                  <TabsContent value="optimization" className="space-y-4">
                    <OptimizationControlPanel
                      portfolioId={selectedPortfolioId}
                      currentAnalysis={selectedPortfolio.analysisResults}
                      isDisabled={selectedPortfolio.analysisStatus !== "completed"}
                      onOptimizationComplete={(result) => {
                        toast({
                          title: "Optimierung abgeschlossen",
                          description: "Die Portfolio-Optimierung wurde erfolgreich durchgeführt."
                        });
                        // Optionally switch to targets tab to apply optimized structure
                        if (result.optimizedPortfolio) {
                          setActiveTab("targets");
                        }
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="reallocation" className="space-y-4">
                    <ReallocationAnalysisView
                      analysis={reallocationAnalysis}
                      isLoading={reallocationMutation.isPending}
                      onExecute={(analysisId) => {
                        toast({ title: "Reallokation würde hier ausgeführt werden" });
                      }}
                      onModify={(analysisId) => {
                        setActiveTab("targets");
                      }}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Factsheet Viewer Modal */}
      {selectedFactsheet && (
        <FactsheetViewer
          instrument={selectedFactsheet}
          isOpen={isFactsheetViewerOpen}
          onClose={() => {
            setIsFactsheetViewerOpen(false);
            setSelectedFactsheet(null);
          }}
        />
      )}
    </div>
  );
}