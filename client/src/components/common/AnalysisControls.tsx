import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Portfolio, AnalysisPhase } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface AnalysisControlsProps {
  portfolio: Portfolio | null;
  onShowAdvancedAnalysis?: () => void;
  onShowOrchestration?: () => void;
  onShowLookThrough?: () => void;
  onShowRiskMetrics?: () => void;
  onShowCompliance?: () => void;
  onShowMaintenance?: () => void;
  onShowComparison?: () => void;
}

export default function AnalysisControls({ 
  portfolio,
  onShowAdvancedAnalysis,
  onShowOrchestration,
  onShowLookThrough,
  onShowRiskMetrics,
  onShowCompliance,
  onShowMaintenance,
  onShowComparison
}: AnalysisControlsProps) {
  const [analysisType, setAnalysisType] = useState("current");
  const { toast } = useToast();

  const { data: phases = [] } = useQuery<AnalysisPhase[]>({
    queryKey: [`/api/portfolios/${portfolio?.id}/phases`], // Consistent key format with AnalysisProgressIndicator
    enabled: !!portfolio?.id,
    refetchInterval: () => {
      // Only poll if portfolio is being analyzed - sync with AnalysisProgressIndicator
      if (!portfolio?.id || (portfolio?.analysisStatus !== 'pending' && portfolio?.analysisStatus !== 'analyzing')) {
        return false;
      }
      return 3000; // Slightly slower polling to reduce load when used together
    },
    // Improve performance and reduce duplicated requests
    staleTime: 2000, // Data is fresh for 2 seconds
    gcTime: 30000, // Keep in cache for 30 seconds after unmount
  });

  const handleExportPDF = () => {
    if (!portfolio) {
      toast({
        title: "Kein Portfolio ausgewählt",
        description: "Bitte wählen Sie zuerst ein Portfolio aus.",
        variant: "destructive",
      });
      return;
    }
    
    // TODO: Implement PDF export
    toast({
      title: "PDF Export",
      description: "PDF Export wird implementiert...",
    });
  };

  const handleExportExcel = () => {
    if (!portfolio) {
      toast({
        title: "Kein Portfolio ausgewählt",
        description: "Bitte wählen Sie zuerst ein Portfolio aus.",
        variant: "destructive",
      });
      return;
    }
    
    // TODO: Implement Excel export
    toast({
      title: "Excel Export",
      description: "Excel Export wird implementiert...",
    });
  };

  const handleAnalysisTypeChange = (value: string) => {
    setAnalysisType(value);
    
    // Automatically show comparison panel when "comparison" is selected
    if (value === "comparison" && onShowComparison) {
      onShowComparison();
    }
  };

  const getPhaseIcon = (phase: AnalysisPhase) => {
    switch (phase.status) {
      case 'completed':
        return <i className="fas fa-check-circle text-green-500"></i>;
      case 'running':
        return <i className="fas fa-spinner fa-spin text-ms-blue"></i>;
      case 'failed':
        return <i className="fas fa-times-circle text-ms-red"></i>;
      default:
        return <i className="fas fa-clock text-gray-400"></i>;
    }
  };

  const getPhaseBackground = (phase: AnalysisPhase) => {
    switch (phase.status) {
      case 'completed':
        return 'bg-green-50';
      case 'running':
        return 'bg-blue-50';
      case 'failed':
        return 'bg-red-50';
      default:
        return 'bg-gray-50';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-serif font-semibold text-ms-green mb-4" data-testid="controls-title">
          Analyse-Optionen
        </h3>
        
        {/* Analysis Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Analyse-Typ</label>
          <Select value={analysisType} onValueChange={handleAnalysisTypeChange} data-testid="analysis-type-select">
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Aktueller Bestand</SelectItem>
              <SelectItem value="comparison">Vorher-Nachher-Vergleich</SelectItem>
              <SelectItem value="stress">Stresstest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Analysis Phases */}
        {portfolio && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Analyse-Phasen</h4>
            <div className="space-y-2">
              {phases.map((phase) => (
                <div 
                  key={phase.id} 
                  className={`flex items-center justify-between p-2 rounded ${getPhaseBackground(phase)}`}
                  data-testid={`phase-${phase.phaseNumber}`}
                >
                  <span className="text-sm text-gray-700">{phase.phaseName}</span>
                  {getPhaseIcon(phase)}
                </div>
              ))}
              
              {/* Default phases if none loaded */}
              {phases.length === 0 && portfolio && (
                <>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">Phase 0: Instrumentenidentifikation</span>
                    <i className="fas fa-clock text-gray-400"></i>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">Phase 1: Portfolio-Grundlagen</span>
                    <i className="fas fa-clock text-gray-400"></i>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">Phase 2: Asset-Allokation</span>
                    <i className="fas fa-clock text-gray-400"></i>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">Phase 3: Geografische Analyse</span>
                    <i className="fas fa-clock text-gray-400"></i>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">Phase 4: Währungsexposure</span>
                    <i className="fas fa-clock text-gray-400"></i>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Comparison Analysis Section */}
        {analysisType === "comparison" && portfolio && portfolio.analysisStatus === 'completed' && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
              <i className="fas fa-balance-scale text-blue-600"></i>
              Portfolio-Vergleich aktiviert
            </h4>
            <p className="text-xs text-blue-700 mb-3">
              Simulieren und vergleichen Sie Portfolio-Änderungen mit Claude AI-Unterstützung.
              Alle Vergleichsanalysen werden von der einheitlichen KI-Instanz durchgeführt.
            </p>
            <Button 
              className="w-full bg-blue-600 text-white hover:bg-blue-700" 
              onClick={onShowComparison}
              size="sm"
            >
              <i className="fas fa-chart-line mr-2"></i>
              Vorher-Nachher-Vergleich öffnen
            </Button>
          </div>
        )}

        {/* Advanced Analysis Options */}
        {portfolio && portfolio.analysisStatus === 'completed' && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              Erweiterte Analyse 
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">Neu</Badge>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline"
                size="sm"
                className="h-auto p-2 text-xs flex flex-col items-center gap-1" 
                onClick={onShowLookThrough}
              >
                <i className="fas fa-layers text-blue-600"></i>
                Look-Through
              </Button>
              <Button 
                variant="outline"
                size="sm"
                className="h-auto p-2 text-xs flex flex-col items-center gap-1" 
                onClick={onShowRiskMetrics}
              >
                <i className="fas fa-shield-alt text-purple-600"></i>
                Risiko-Hybrid
              </Button>
              <Button 
                variant="outline"
                size="sm"
                className="h-auto p-2 text-xs flex flex-col items-center gap-1" 
                onClick={onShowCompliance}
              >
                <i className="fas fa-gavel text-green-600"></i>
                Compliance
              </Button>
              <Button 
                variant="outline"
                size="sm"
                className="h-auto p-2 text-xs flex flex-col items-center gap-1" 
                onClick={onShowMaintenance}
              >
                <i className="fas fa-cogs text-yellow-600"></i>
                Wartung
              </Button>
            </div>
            
            <div className="space-y-2 mt-3">
              <Button 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 text-sm" 
                onClick={onShowAdvancedAnalysis}
              >
                <i className="fas fa-rocket mr-2"></i>
                Erweiterte Analyse (Phase 11)
              </Button>
              <Button 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 text-sm" 
                onClick={onShowOrchestration}
              >
                <i className="fas fa-bolt mr-2"></i>
                High-Performance (Phase 12)
              </Button>
            </div>
          </div>
        )}

        {/* Export Options */}
        <div className="border-t pt-4 mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Export</h4>
          <div className="space-y-2">
            <Button 
              className="w-full bg-ms-green text-white hover:bg-ms-green/90" 
              onClick={handleExportPDF}
              data-testid="export-pdf"
            >
              <i className="fas fa-file-pdf mr-2"></i>PDF Report
            </Button>
            <Button 
              className="w-full bg-ms-blue text-white hover:bg-ms-blue/90" 
              onClick={handleExportExcel}
              data-testid="export-excel"
            >
              <i className="fas fa-file-excel mr-2"></i>Excel Tabellen
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
