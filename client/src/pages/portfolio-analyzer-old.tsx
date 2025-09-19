import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from "react";
import FileUpload from "@/components/FileUpload";
import FormatGuidance from "@/components/FormatGuidance";
import PortfolioChat from "@/components/PortfolioChat";
import { useQuery } from "@tanstack/react-query";
import { Portfolio } from "@shared/schema";
import { useSmartRefresh } from "@/hooks/use-smart-refresh";
import { AnalysisControlsSkeleton, AnalysisResultsSkeleton } from "@/components/ui/skeleton-loader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, HelpCircle, MessageCircle, Brain, Database, Clock, TrendingUp } from "lucide-react";

// Lazy load new advanced analysis components
const EnhancedAnalysisPanel = lazy(() => import("@/components/EnhancedAnalysisPanel"));
const HighPerformanceOrchestration = lazy(() => import("@/components/HighPerformanceOrchestration"));
const LookThroughAnalysis = lazy(() => import("@/components/LookThroughAnalysis"));
const HybridRiskMetrics = lazy(() => import("@/components/HybridRiskMetrics"));
const ComplianceReporting = lazy(() => import("@/components/ComplianceReporting"));
const InvestmentUniverseMaintenance = lazy(() => import("@/components/InvestmentUniverseMaintenance"));
const PortfolioComparisonPanel = lazy(() => import("@/components/PortfolioComparisonPanel"));

// Lazy load heavy analysis components
const AnalysisControls = lazy(() => import("@/components/AnalysisControls"));
const AnalysisResults = lazy(() => import("@/components/AnalysisResults"));

export default function PortfolioAnalyzer() {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [showFormatGuidance, setShowFormatGuidance] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  // New advanced analysis component visibility states
  const [showEnhancedAnalysis, setShowEnhancedAnalysis] = useState(false);
  const [showOrchestration, setShowOrchestration] = useState(false);
  const [showLookThrough, setShowLookThrough] = useState(false);
  const [showRiskMetrics, setShowRiskMetrics] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [chatChangeRequest, setChatChangeRequest] = useState<any>(null);

  const { data: portfolios = [], isLoading } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolios"],
  });

  // Query for knowledge base data for selected portfolio
  const { data: knowledgeData = [], error: knowledgeError } = useQuery({
    queryKey: [`/api/portfolios/${selectedPortfolioId}/knowledge`],
    enabled: !!selectedPortfolioId,
    select: (data: any) => data?.data || [],
    staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 404 or 403 errors
      if (error?.status === 404 || error?.status === 403) return false;
      return failureCount < 2;
    }
  });

  // Query for portfolio snapshots
  const { data: snapshots = [], error: snapshotsError } = useQuery({
    queryKey: [`/api/portfolios/${selectedPortfolioId}/snapshots`],
    enabled: !!selectedPortfolioId,
    select: (data: any) => data?.data || [],
    staleTime: 2 * 60 * 1000, // Data is fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: (failureCount, error: any) => {
      if (error?.status === 404 || error?.status === 403) return false;
      return failureCount < 2;
    }
  });

  // Smart auto-refresh for analyzing portfolios
  const hasAnalyzing = useMemo(() => 
    portfolios.some(p => p.analysisStatus === 'pending' || p.analysisStatus === 'analyzing'),
    [portfolios]
  );

  const { refreshCount, isRefreshing } = useSmartRefresh({
    queryKey: ["/api/portfolios"],
    condition: hasAnalyzing,
    interval: 2000, // 2 seconds for faster updates during analysis
    maxRefreshes: 300 // 10 minutes max with faster refresh
  });

  const selectedPortfolio = useMemo(() => {
    if (!selectedPortfolioId) return null;
    return portfolios.find(p => p.id === selectedPortfolioId) || null;
  }, [portfolios, selectedPortfolioId]);

  // Effect to clear selectedPortfolioId if the portfolio was deleted
  useEffect(() => {
    if (selectedPortfolioId && portfolios.length > 0 && !selectedPortfolio) {
      console.log('Selected portfolio was deleted, clearing selection');
      setSelectedPortfolioId(null);
    }
  }, [selectedPortfolioId, portfolios, selectedPortfolio]);

  const handleUploadSuccess = useCallback((portfolio: Portfolio) => {
    setSelectedPortfolioId(portfolio.id);
  }, []);

  const handleSelectPortfolio = useCallback((id: string | null) => {
    setSelectedPortfolioId(id);
  }, []);

  return (
    <div className="min-h-screen bg-ms-cream">
      {/* Navigation */}
      <nav className="bg-ms-green text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-serif font-bold" data-testid="nav-title">Meeder & Seifer</h1>
                <p className="text-xs opacity-80">Portfolio-Analyser</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-ms-green/50 px-3 py-1 rounded-full">
                <i className="fas fa-robot text-green-400"></i>
                <span className="text-sm">Claude AI</span>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              {selectedPortfolio?.analysisStatus === 'completed' && (
                <div className="flex items-center space-x-2">
                  <Badge className="bg-blue-100 text-blue-800 text-xs animate-pulse">
                    Phase 7-12 verfügbar
                  </Badge>
                  <div className="flex items-center space-x-1">
                    {(showEnhancedAnalysis || showOrchestration || showLookThrough || showRiskMetrics || showCompliance || showMaintenance || showComparison) && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                        {[showEnhancedAnalysis, showOrchestration, showLookThrough, showRiskMetrics, showCompliance, showMaintenance, showComparison]
                          .filter(Boolean).length} aktiv
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              <button className="p-2 rounded-md hover:bg-ms-green/70" data-testid="user-menu">
                <i className="fas fa-user"></i>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        <FileUpload 
          onUploadSuccess={handleUploadSuccess}
          portfolios={portfolios}
          selectedPortfolioId={selectedPortfolioId}
          onSelectPortfolio={handleSelectPortfolio}
        />

        {/* Format Guidance Section */}
        <div className="mb-8">
          <Collapsible open={showFormatGuidance} onOpenChange={setShowFormatGuidance}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full flex items-center justify-between p-4 h-auto text-left"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-ms-blue" />
                  <div>
                    <div className="font-medium text-ms-green">Dateiformate & Hilfe</div>
                    <div className="text-sm text-gray-600">
                      Unterstützte Formate, Beispiele und Tipps für den Upload
                    </div>
                  </div>
                </div>
                {showFormatGuidance ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <FormatGuidance />
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Knowledge Indicators */}
        {selectedPortfolio && (
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-lg font-serif font-semibold text-ms-green flex items-center gap-2">
                <Brain className="w-5 h-5" />
                KI-Portfolio-Assistent
              </h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Claude AI aktiv</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Knowledge Base Indicator */}
              <Card className="hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-ms-blue" />
                        <span className="text-sm font-medium text-gray-700">Wissensbasis</span>
                      </div>
                      <div className="text-2xl font-bold text-ms-green mb-1">
                        {knowledgeError ? '?' : knowledgeData.length}
                      </div>
                      <div className="text-xs text-gray-600">
                        {knowledgeError 
                          ? 'Fehler beim Laden der Daten' 
                          : 'Gespeicherte Analysen und Erkenntnisse'
                        }
                      </div>
                    </div>
                    <Badge variant={knowledgeError ? "destructive" : "secondary"} className="text-xs">
                      {knowledgeError 
                        ? 'Fehler' 
                        : knowledgeData.length > 0 ? 'Verfügbar' : 'Leer'
                      }
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Portfolio Snapshots */}
              <Card className="hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-medium text-gray-700">Snapshots</span>
                      </div>
                      <div className="text-2xl font-bold text-ms-green mb-1">
                        {snapshotsError ? '?' : snapshots.length}
                      </div>
                      <div className="text-xs text-gray-600">
                        {snapshotsError 
                          ? 'Fehler beim Laden der Historie' 
                          : 'Versionsstände des Portfolios'
                        }
                      </div>
                    </div>
                    <Badge variant={snapshotsError ? "destructive" : "secondary"} className="text-xs">
                      {snapshotsError ? 'Fehler' : 'Historie'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Chat Status */}
              <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer" onClick={() => setShowChat(true)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="w-4 h-4 text-ms-green" />
                        <span className="text-sm font-medium text-gray-700">Portfolio-Chat</span>
                      </div>
                      <div className="text-sm font-medium text-ms-green mb-1">
                        {selectedPortfolio.analysisStatus === 'completed' ? 'Bereit' : 'Analyse läuft...'}
                      </div>
                      <div className="text-xs text-gray-600">
                        Direkt mit Claude AI interagieren
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Insights */}
            {(knowledgeData.length > 0 || knowledgeError) && (
              <Card className="mt-4">
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-ms-blue" />
                    Letzte Erkenntnisse
                    {knowledgeError && (
                      <Badge variant="destructive" className="text-xs ml-auto">
                        Ladefehler
                      </Badge>
                    )}
                  </h3>
                  
                  {knowledgeError ? (
                    <div className="text-center py-4">
                      <div className="text-sm text-gray-500 mb-2">
                        Erkenntnisse konnten nicht geladen werden
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowChat(true)}
                      >
                        Chat trotzdem öffnen
                      </Button>
                    </div>
                  ) : knowledgeData.length === 0 ? (
                    <div className="text-center py-4">
                      <div className="text-sm text-gray-500 mb-2">
                        Noch keine Erkenntnisse verfügbar
                      </div>
                      <div className="text-xs text-gray-400">
                        Nach der ersten Analyse werden hier KI-Erkenntnisse angezeigt
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {knowledgeData.slice(0, 2).map((entry: any, index: number) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-start justify-between mb-1">
                              <span className="text-xs font-medium text-ms-green uppercase">
                                {entry.analysisType?.replace('_', ' ')}
                              </span>
                              <span className="text-xs text-gray-500">
                                {entry.createdAt 
                                  ? new Date(entry.createdAt).toLocaleDateString('de-DE')
                                  : 'Datum unbekannt'
                                }
                              </span>
                            </div>
                            {entry.insights && (
                              <p className="text-sm text-gray-700 line-clamp-2">
                                {entry.insights}
                              </p>
                            )}
                            {entry.confidence && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-gray-600">Vertrauen:</span>
                                <div className="flex-1 bg-gray-200 rounded-full h-1">
                                  <div 
                                    className="bg-ms-green h-1 rounded-full" 
                                    style={{ width: `${Math.min(100, Math.max(0, parseFloat(entry.confidence) * 100))}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-600">
                                  {Math.round(Math.min(100, Math.max(0, parseFloat(entry.confidence) * 100)))}%
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {knowledgeData.length > 2 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3 w-full"
                          onClick={() => setShowChat(true)}
                        >
                          Alle Erkenntnisse im Chat ansehen ({knowledgeData.length - 2} weitere)
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Sidebar Controls */}
          <div className="xl:col-span-1">
            <Suspense fallback={<AnalysisControlsSkeleton />}>
              <AnalysisControls 
                portfolio={selectedPortfolio}
                onShowAdvancedAnalysis={() => setShowEnhancedAnalysis(!showEnhancedAnalysis)}
                onShowOrchestration={() => setShowOrchestration(!showOrchestration)}
                onShowLookThrough={() => setShowLookThrough(!showLookThrough)}
                onShowRiskMetrics={() => setShowRiskMetrics(!showRiskMetrics)}
                onShowCompliance={() => setShowCompliance(!showCompliance)}
                onShowMaintenance={() => setShowMaintenance(!showMaintenance)}
                onShowComparison={() => setShowComparison(!showComparison)}
              />
            </Suspense>
          </div>

          {/* Main Analysis Results */}
          <div className="xl:col-span-3">
            <Suspense fallback={<AnalysisResultsSkeleton />}>
              <AnalysisResults 
                portfolio={selectedPortfolio}
                portfolioId={selectedPortfolioId}
              />
            </Suspense>
          </div>
        </div>

        {/* Enhanced Floating Chat Button */}
        {selectedPortfolio && (
          <div className="fixed bottom-6 right-6 z-40">
            <div className="flex flex-col items-end gap-3">
              {/* Knowledge Quick Access */}
              {knowledgeData.length > 0 && !showChat && (
                <div className="bg-white rounded-lg shadow-lg p-3 max-w-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-ms-blue" />
                    <span className="text-sm font-medium text-gray-700">Wissensbasierte Beratung</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    {knowledgeData.length} Analyse-Erkenntnisse verfügbar
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setShowChat(true)}
                      className="text-xs"
                    >
                      Fragen stellen
                    </Button>
                  </div>
                </div>
              )}

              {/* Main Chat Button */}
              <Button
                onClick={() => setShowChat(true)}
                size="lg"
                className={`${
                  selectedPortfolio.analysisStatus === 'completed' 
                    ? 'bg-ms-green hover:bg-ms-green/90' 
                    : 'bg-gray-500 hover:bg-gray-600'
                } text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 px-6 relative`}
                disabled={selectedPortfolio.analysisStatus !== 'completed'}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                {selectedPortfolio.analysisStatus === 'completed' ? 'KI-Berater' : 'Analyse läuft...'}
                
                {/* Notification Badge for new insights */}
                {knowledgeData.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{knowledgeData.length}</span>
                  </div>
                )}
                
                {/* AI Status Indicator */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white">
                  <div className="w-full h-full bg-green-400 rounded-full animate-pulse"></div>
                </div>
              </Button>
            </div>
          </div>
        )}

        {/* Advanced Analysis Components */}
        {selectedPortfolioId && selectedPortfolio?.analysisStatus === 'completed' && (
          <>
            {/* Phase 11: Enhanced Analysis Panel */}
            {showEnhancedAnalysis && (
              <div className="mt-6">
                <Suspense fallback={
                  <Card>
                    <CardContent className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ms-blue mx-auto mb-4"></div>
                      <span>Erweiterte Analyse wird geladen...</span>
                    </CardContent>
                  </Card>
                }>
                  <EnhancedAnalysisPanel portfolioId={selectedPortfolioId} />
                </Suspense>
              </div>
            )}

            {/* Phase 12: High-Performance Orchestration */}
            {showOrchestration && (
              <div className="mt-6">
                <Suspense fallback={
                  <Card>
                    <CardContent className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                      <span>Orchestrierung wird geladen...</span>
                    </CardContent>
                  </Card>
                }>
                  <HighPerformanceOrchestration portfolioId={selectedPortfolioId} />
                </Suspense>
              </div>
            )}

            {/* Phase 7: Look-Through Analysis */}
            {showLookThrough && (
              <div className="mt-6">
                <Suspense fallback={
                  <Card>
                    <CardContent className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <span>Look-Through-Analyse wird geladen...</span>
                    </CardContent>
                  </Card>
                }>
                  <LookThroughAnalysis portfolioId={selectedPortfolioId} />
                </Suspense>
              </div>
            )}

            {/* Phase 8: Hybrid Risk Metrics */}
            {showRiskMetrics && (
              <div className="mt-6">
                <Suspense fallback={
                  <Card>
                    <CardContent className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                      <span>Risikometriken werden geladen...</span>
                    </CardContent>
                  </Card>
                }>
                  <HybridRiskMetrics portfolioId={selectedPortfolioId} />
                </Suspense>
              </div>
            )}

            {/* Phase 9: Compliance Reporting */}
            {showCompliance && (
              <div className="mt-6">
                <Suspense fallback={
                  <Card>
                    <CardContent className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                      <span>Compliance-Berichte werden geladen...</span>
                    </CardContent>
                  </Card>
                }>
                  <ComplianceReporting portfolioId={selectedPortfolioId} />
                </Suspense>
              </div>
            )}

            {/* Phase 10: Investment Universe Maintenance */}
            {showMaintenance && (
              <div className="mt-6">
                <Suspense fallback={
                  <Card>
                    <CardContent className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-4"></div>
                      <span>Wartung wird geladen...</span>
                    </CardContent>
                  </Card>
                }>
                  <InvestmentUniverseMaintenance portfolioId={selectedPortfolioId} />
                </Suspense>
              </div>
            )}

            {/* Portfolio Comparison (Vorher-Nachher-Vergleich) */}
            {showComparison && (
              <div className="mt-6">
                <Suspense fallback={
                  <Card>
                    <CardContent className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <span>Portfolio-Vergleich wird geladen...</span>
                    </CardContent>
                  </Card>
                }>
                  <PortfolioComparisonPanel 
                    portfolioId={selectedPortfolioId} 
                    chatChangeRequest={chatChangeRequest}
                    onClearChatRequest={() => setChatChangeRequest(null)}
                  />
                </Suspense>
              </div>
            )}
          </>
        )}

        {/* Chat Component */}
        {selectedPortfolioId && (
          <Suspense fallback={
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-ms-green"></div>
                  <span>KI-Chat wird geladen...</span>
                </div>
              </div>
            </div>
          }>
            <PortfolioChat
              portfolioId={selectedPortfolioId}
              isOpen={showChat}
              onClose={() => setShowChat(false)}
              onShowComparison={(changeRequest) => {
                setChatChangeRequest(changeRequest);
                setShowComparison(true);
              }}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
