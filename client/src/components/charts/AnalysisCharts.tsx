import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AssetAllocationChart } from "./AssetAllocationChart";
import { GeographicChart } from "./GeographicChart";
import { CurrencyChart } from "./CurrencyChart";
import { PortfolioSummaryCards } from "./PortfolioSummaryCards";
import { 
  PortfolioAnalysisResult, 
  isValidAssetAllocation, 
  isValidGeographicAllocation,
  isValidCurrencyExposure,
  isValidRiskMetrics
} from "@/types/analysis";
import { PieChart, Map, Banknote, BarChart3, AlertCircle, CheckCircle } from "lucide-react";

interface AnalysisChartsProps {
  analysisResults?: PortfolioAnalysisResult;
  totalValue?: number;
  isLoading?: boolean;
}

export function AnalysisCharts({ analysisResults, totalValue, isLoading = false }: AnalysisChartsProps) {
  const [activeTab, setActiveTab] = useState("overview");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 animate-pulse" />
            Analyse läuft...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">
                Claude analysiert das Portfolio...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysisResults) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio-Analyse</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            Starten Sie eine Analyse, um Visualisierungen zu sehen
          </div>
        </CardContent>
      </Card>
    );
  }

  // Datenvalidierung
  const hasAssetAllocation = analysisResults.assetAllocation && 
    isValidAssetAllocation(analysisResults.assetAllocation);
  const hasGeographicAllocation = analysisResults.geographicAllocation && 
    isValidGeographicAllocation(analysisResults.geographicAllocation);
  const hasCurrencyExposure = analysisResults.currencyExposure && 
    isValidCurrencyExposure(analysisResults.currencyExposure);
  const hasRiskMetrics = analysisResults.riskMetrics && 
    isValidRiskMetrics(analysisResults.riskMetrics);
  const hasSummary = analysisResults.summary && analysisResults.summary.trim().length > 0;

  // Fehlerbehandlung für unvollständige Daten
  const hasValidData = hasAssetAllocation || hasGeographicAllocation || 
    hasCurrencyExposure || hasRiskMetrics || hasSummary;

  if (!hasValidData && analysisResults.error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-red-800">
          <strong>Analysefehler:</strong> {analysisResults.error}
          {analysisResults.rawAnalysis && (
            <details className="mt-2">
              <summary className="cursor-pointer font-medium">Rohe Antwort anzeigen</summary>
              <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
                {analysisResults.rawAnalysis}
              </pre>
            </details>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (!hasValidData && analysisResults.rawAnalysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio-Analyse (Rohformat)</CardTitle>
          <Badge variant="secondary">Strukturierung fehlgeschlagen</Badge>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Die Analyse konnte nicht in das erwartete Format konvertiert werden. 
              Die Rohdaten werden unten angezeigt.
            </AlertDescription>
          </Alert>
          <div className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
            <pre className="text-sm whitespace-pre-wrap">
              {analysisResults.rawAnalysis}
            </pre>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Verfügbare Tabs basierend auf Daten bestimmen
  const availableTabs = [
    { 
      id: "overview", 
      label: "Überblick", 
      icon: BarChart3, 
      available: hasRiskMetrics || hasSummary 
    },
    { 
      id: "allocation", 
      label: "Asset-Allokation", 
      icon: PieChart, 
      available: hasAssetAllocation 
    },
    { 
      id: "geographic", 
      label: "Geografisch", 
      icon: Map, 
      available: hasGeographicAllocation 
    },
    { 
      id: "currency", 
      label: "Währungen", 
      icon: Banknote, 
      available: hasCurrencyExposure 
    }
  ].filter(tab => tab.available);

  // Default Tab setzen wenn aktueller Tab nicht verfügbar
  if (!availableTabs.find(tab => tab.id === activeTab)) {
    setActiveTab(availableTabs[0]?.id || "overview");
  }

  return (
    <div className="space-y-6">
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span className="text-sm text-green-600 font-medium">
          Analyse erfolgreich abgeschlossen
        </span>
        <Badge variant="outline">
          {availableTabs.length} Kategorie{availableTabs.length !== 1 ? 'n' : ''} verfügbar
        </Badge>
      </div>

      {/* Chart Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          {availableTabs.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <PortfolioSummaryCards 
            riskMetrics={hasRiskMetrics ? analysisResults.riskMetrics : undefined}
            summary={hasSummary ? analysisResults.summary : undefined}
          />
        </TabsContent>

        <TabsContent value="allocation" className="mt-6">
          {hasAssetAllocation && (
            <AssetAllocationChart 
              data={analysisResults.assetAllocation!} 
              totalValue={totalValue}
            />
          )}
        </TabsContent>

        <TabsContent value="geographic" className="mt-6">
          {hasGeographicAllocation && (
            <GeographicChart 
              data={analysisResults.geographicAllocation!} 
              totalValue={totalValue}
            />
          )}
        </TabsContent>

        <TabsContent value="currency" className="mt-6">
          {hasCurrencyExposure && (
            <CurrencyChart 
              data={analysisResults.currencyExposure!} 
              totalValue={totalValue}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Debug-Info für Entwicklung */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-8">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            🔧 Debug: Analysedaten (nur in Entwicklungsumgebung)
          </summary>
          <div className="mt-2 p-3 bg-gray-100 rounded text-xs">
            <pre>{JSON.stringify(analysisResults, null, 2)}</pre>
          </div>
        </details>
      )}
    </div>
  );
}