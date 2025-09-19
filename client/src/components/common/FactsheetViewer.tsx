import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  FileText,
  Eye,
  AlertCircle,
  Loader2,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw
} from "lucide-react";

interface InvestmentUniverseItem {
  name: string;
  isin?: string;
  assetClass: string;
  category: string;
  factsheetPath: string;
  hasFactsheet: boolean;
  fileName: string;
  confidence: number;
  factsheetData?: {
    fullName?: string;
    ter?: number;
    assetAllocation?: Record<string, number>;
    geographicAllocation?: Record<string, number>;
  };
}

interface FactsheetContent {
  success: boolean;
  text?: string;
  metadata?: {
    pages: number;
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modificationDate?: string;
  };
  analysis?: {
    assetAllocation?: Record<string, number>;
    geographicAllocation?: Record<string, number>;
    topHoldings?: Array<{
      name: string;
      weight: number;
    }>;
    riskMetrics?: {
      volatility?: number;
      sharpeRatio?: number;
    };
  };
}

interface FactsheetViewerProps {
  instrument: InvestmentUniverseItem;
  isOpen: boolean;
  onClose: () => void;
}

export function FactsheetViewer({ instrument, isOpen, onClose }: FactsheetViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfScale, setPdfScale] = useState(1.0);
  const [pdfRotation, setPdfRotation] = useState(0);

  // Fetch factsheet content/metadata
  const { data: factsheetContent, isLoading: isLoadingContent, error: contentError } = useQuery<FactsheetContent>({
    queryKey: [`/api/factsheets/${instrument.fileName}/content`],
    enabled: isOpen && instrument.hasFactsheet,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // PDF URL for iframe
  const pdfUrl = `/api/factsheets/${encodeURIComponent(instrument.fileName)}`;

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle zoom controls
  const zoomIn = () => setPdfScale(prev => Math.min(prev + 0.25, 3.0));
  const zoomOut = () => setPdfScale(prev => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setPdfScale(1.0);

  // Handle rotation
  const rotate = () => setPdfRotation(prev => (prev + 90) % 360);

  // Handle download
  const handleDownload = () => {
    window.open(pdfUrl, '_blank');
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setIsFullscreen(false);
      setPdfScale(1.0);
      setPdfRotation(0);
    }
  }, [isOpen]);

  if (!instrument.hasFactsheet) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Kein Factsheet verfügbar
            </DialogTitle>
            <DialogDescription>
              Für dieses Instrument ist kein Factsheet verfügbar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={onClose}>Schließen</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isFullscreen ? 'max-w-[95vw] max-h-[95vh]' : 'max-w-6xl max-h-[85vh]'} overflow-hidden`}>
        <DialogHeader className="space-y-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <DialogTitle className="text-lg">{instrument.name}</DialogTitle>
              <DialogDescription className="mt-1">
                {instrument.isin && (
                  <code className="text-sm">{instrument.isin}</code>
                )}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Instrument Info */}
          <div className="flex gap-2">
            <Badge variant="outline">{instrument.assetClass}</Badge>
            <Badge variant="secondary">{instrument.category}</Badge>
            <Badge variant="outline">
              Qualität: {(instrument.confidence * 100).toFixed(0)}%
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="viewer" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="viewer">PDF Viewer</TabsTrigger>
              <TabsTrigger value="metadata">Metadaten</TabsTrigger>
              <TabsTrigger value="analysis">Analyse</TabsTrigger>
            </TabsList>

            <TabsContent value="viewer" className="flex-1 flex flex-col space-y-4">
              {/* PDF Controls */}
              <div className="flex justify-between items-center border-b pb-2">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={zoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={resetZoom}>
                    {(pdfScale * 100).toFixed(0)}%
                  </Button>
                  <Button variant="outline" size="sm" onClick={zoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={rotate}>
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </div>
                {factsheetContent?.metadata && (
                  <div className="text-sm text-muted-foreground">
                    {factsheetContent.metadata.pages} Seiten
                  </div>
                )}
              </div>

              {/* PDF Viewer */}
              <div className="flex-1 border rounded-lg overflow-hidden bg-gray-50">
                <iframe
                  src={`${pdfUrl}#zoom=${pdfScale * 100}&rotate=${pdfRotation}`}
                  className="w-full h-full"
                  title={`Factsheet: ${instrument.name}`}
                  onError={() => {
                    console.error('Failed to load PDF');
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="metadata" className="flex-1 overflow-auto">
              {isLoadingContent ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Lade Metadaten...</span>
                </div>
              ) : contentError ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-red-600">
                      Fehler beim Laden der Metadaten: {contentError.message}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Basic Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Grundinformationen</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium">Dateiname</div>
                          <div className="text-sm text-muted-foreground">{instrument.fileName}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Datenqualität</div>
                          <div className="flex items-center gap-2">
                            <Progress value={instrument.confidence * 100} className="flex-1" />
                            <span className="text-sm">{(instrument.confidence * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>

                      {instrument.factsheetData?.fullName && (
                        <div>
                          <div className="text-sm font-medium">Vollständiger Name</div>
                          <div className="text-sm text-muted-foreground">{instrument.factsheetData.fullName}</div>
                        </div>
                      )}

                      {instrument.factsheetData?.ter && (
                        <div>
                          <div className="text-sm font-medium">Total Expense Ratio (TER)</div>
                          <div className="text-sm text-muted-foreground">{instrument.factsheetData.ter}%</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* PDF Metadata */}
                  {factsheetContent?.metadata && (
                    <Card>
                      <CardHeader>
                        <CardTitle>PDF-Metadaten</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="grid grid-cols-2 gap-4">
                          {factsheetContent.metadata.title && (
                            <div>
                              <div className="text-sm font-medium">Titel</div>
                              <div className="text-sm text-muted-foreground">{factsheetContent.metadata.title}</div>
                            </div>
                          )}
                          {factsheetContent.metadata.author && (
                            <div>
                              <div className="text-sm font-medium">Autor</div>
                              <div className="text-sm text-muted-foreground">{factsheetContent.metadata.author}</div>
                            </div>
                          )}
                          {factsheetContent.metadata.creationDate && (
                            <div>
                              <div className="text-sm font-medium">Erstellt am</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(factsheetContent.metadata.creationDate).toLocaleDateString('de-DE')}
                              </div>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium">Seiten</div>
                            <div className="text-sm text-muted-foreground">{factsheetContent.metadata.pages}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="analysis" className="flex-1 overflow-auto">
              {isLoadingContent ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Lade Analyse...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Asset Allocation */}
                  {(instrument.factsheetData?.assetAllocation || factsheetContent?.analysis?.assetAllocation) && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Asset-Allokation</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {Object.entries(instrument.factsheetData?.assetAllocation || factsheetContent?.analysis?.assetAllocation || {})
                            .sort(([,a], [,b]) => b - a)
                            .map(([asset, percentage]) => (
                              <div key={asset} className="flex justify-between items-center">
                                <span className="text-sm">{asset}</span>
                                <div className="flex items-center gap-2">
                                  <Progress value={percentage} className="w-20" />
                                  <span className="text-sm w-12 text-right">{percentage.toFixed(1)}%</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Geographic Allocation */}
                  {(instrument.factsheetData?.geographicAllocation || factsheetContent?.analysis?.geographicAllocation) && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Geografische Allokation</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {Object.entries(instrument.factsheetData?.geographicAllocation || factsheetContent?.analysis?.geographicAllocation || {})
                            .sort(([,a], [,b]) => b - a)
                            .map(([region, percentage]) => (
                              <div key={region} className="flex justify-between items-center">
                                <span className="text-sm">{region}</span>
                                <div className="flex items-center gap-2">
                                  <Progress value={percentage} className="w-20" />
                                  <span className="text-sm w-12 text-right">{percentage.toFixed(1)}%</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Top Holdings */}
                  {factsheetContent?.analysis?.topHoldings && factsheetContent.analysis.topHoldings.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Top Holdings</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {factsheetContent.analysis.topHoldings.map((holding, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="text-sm">{holding.name}</span>
                              <span className="text-sm w-12 text-right">{holding.weight.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Risk Metrics */}
                  {factsheetContent?.analysis?.riskMetrics && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Risikokennzahlen</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          {factsheetContent.analysis.riskMetrics.volatility && (
                            <div>
                              <div className="text-sm font-medium">Volatilität</div>
                              <div className="text-sm text-muted-foreground">
                                {factsheetContent.analysis.riskMetrics.volatility.toFixed(2)}%
                              </div>
                            </div>
                          )}
                          {factsheetContent.analysis.riskMetrics.sharpeRatio && (
                            <div>
                              <div className="text-sm font-medium">Sharpe Ratio</div>
                              <div className="text-sm text-muted-foreground">
                                {factsheetContent.analysis.riskMetrics.sharpeRatio.toFixed(2)}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* No Analysis Available */}
                  {!instrument.factsheetData?.assetAllocation &&
                   !factsheetContent?.analysis?.assetAllocation &&
                   !factsheetContent?.analysis?.topHoldings && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Keine Analysedaten verfügbar</p>
                          <p className="text-sm">Das Factsheet konnte noch nicht automatisch analysiert werden.</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}