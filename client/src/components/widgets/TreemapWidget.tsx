import React, { useState, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Map, Loader2 } from "lucide-react";
import WidgetContainer from "./WidgetContainer";
import TreemapChart from "../charts/TreemapChart";
import TreemapBreadcrumb, { EnhancedTreemapBreadcrumb } from "../charts/TreemapBreadcrumb";
import TreemapControls, { CurrentModeIndicator, PerformanceLegend } from "../charts/TreemapControls";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  TreemapData,
  TreemapD3Node,
  TreemapSizeMode,
  TreemapColorMode,
  TreemapTooltipData,
  PortfolioData,
} from "@/types/treemap";
import {
  transformPortfolioToTreemap,
  generateSimulatedTreemapData,
  validateTreemapData,
} from "@/utils/treemapDataTransform";
import {
  exportTreemapAsPNG,
  exportTreemapAsSVG,
  prepareElementForExport,
} from "@/utils/treemapExport";
import { useToast } from "@/hooks/use-toast";

interface TreemapWidgetProps {
  selectedPortfolioId?: string | null;
  onRefresh?: () => void;
  onMaximize?: () => void;
  onSettings?: () => void;
  compact?: boolean;
}

// Custom tooltip component
function TreemapTooltip({ tooltip }: { tooltip: TreemapTooltipData | null }) {
  if (!tooltip) return null;

  return (
    <div
      className="fixed z-50 bg-background border rounded-lg shadow-lg p-3 pointer-events-none"
      style={{
        left: tooltip.position.x + 10,
        top: tooltip.position.y - 10,
        transform: "translateX(-50%)",
      }}
    >
      <div className="space-y-1">
        <p className="font-semibold text-sm">{tooltip.name}</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Wert:</span>
            <span className="ml-1 font-medium">{tooltip.value}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Performance:</span>
            <span className="ml-1 font-medium">{tooltip.performance}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Gewichtung:</span>
            <span className="ml-1 font-medium">{tooltip.weight}</span>
          </div>
          {tooltip.metadata?.instrumentType && (
            <div>
              <span className="text-muted-foreground">Typ:</span>
              <span className="ml-1 font-medium">{tooltip.metadata.instrumentType}</span>
            </div>
          )}
        </div>
        {tooltip.metadata?.isin && (
          <p className="text-xs text-muted-foreground border-t pt-1">
            ISIN: {tooltip.metadata.isin}
          </p>
        )}
      </div>
    </div>
  );
}

export function TreemapWidget({
  selectedPortfolioId,
  onRefresh,
  onMaximize,
  onSettings,
  compact = false,
}: TreemapWidgetProps) {
  const { toast } = useToast();
  const treemapRef = useRef<HTMLDivElement>(null);

  // State management
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [sizeMode, setSizeMode] = useState<TreemapSizeMode>("value");
  const [colorMode, setColorMode] = useState<TreemapColorMode>("performance");
  const [tooltip, setTooltip] = useState<TreemapTooltipData | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch portfolio data
  const { data: portfolios = [], isLoading, error } = useQuery<PortfolioData[]>({
    queryKey: ["/api/portfolios"],
    refetchInterval: 60000, // Refresh every minute
  });

  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);

  // Transform portfolio data to treemap format
  const treemapData = useMemo((): TreemapData => {
    if (!selectedPortfolio) {
      return generateSimulatedTreemapData();
    }

    try {
      const data = transformPortfolioToTreemap(selectedPortfolio);

      if (!validateTreemapData(data)) {
        console.warn("Invalid treemap data, falling back to simulated data");
        return generateSimulatedTreemapData();
      }

      return data;
    } catch (error) {
      console.error("Error transforming portfolio data:", error);
      return generateSimulatedTreemapData();
    }
  }, [selectedPortfolio]);

  // Get current level data based on path
  const currentLevelData = useMemo((): TreemapData => {
    if (currentPath.length === 0) {
      return treemapData;
    }

    let current: TreemapData | any = treemapData;

    for (const pathSegment of currentPath) {
      const found = current.children?.find((child: any) => child.name === pathSegment);
      if (!found || !found.children) {
        // Path doesn't exist, reset to root
        setCurrentPath([]);
        return treemapData;
      }
      current = found;
    }

    return {
      name: current.name,
      totalValue: current.value || treemapData.totalValue,
      baseCurrency: treemapData.baseCurrency,
      lastUpdated: treemapData.lastUpdated,
      children: current.children || [],
    };
  }, [treemapData, currentPath]);

  // Event handlers
  const handleNodeClick = useCallback((node: TreemapD3Node, path: string[]) => {
    if (node.children && node.children.length > 0) {
      setCurrentPath(path);
      setTooltip(null);
    }
  }, []);

  const handleNodeHover = useCallback((tooltipData: TreemapTooltipData | null) => {
    setTooltip(tooltipData);
  }, []);

  const handleBreadcrumbNavigate = useCallback((targetPath: string[]) => {
    setCurrentPath(targetPath);
    setTooltip(null);
  }, []);

  const handleReset = useCallback(() => {
    setCurrentPath([]);
    setTooltip(null);
  }, []);

  const handleExport = useCallback(async (format: "png" | "svg") => {
    if (!treemapRef.current) return;

    setIsExporting(true);

    try {
      await prepareElementForExport(treemapRef.current);

      if (format === "png") {
        await exportTreemapAsPNG(treemapRef.current, {
          filename: `${treemapData.name}_Treemap_${new Date().toISOString().split('T')[0]}.png`,
        });
      } else {
        const svgElement = treemapRef.current.querySelector("svg");
        if (svgElement) {
          await exportTreemapAsSVG(svgElement, {
            filename: `${treemapData.name}_Treemap_${new Date().toISOString().split('T')[0]}.svg`,
          });
        }
      }

      toast({
        title: "Export erfolgreich",
        description: `Treemap wurde als ${format.toUpperCase()} exportiert.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export fehlgeschlagen",
        description: "Fehler beim Exportieren der Treemap.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [treemapData.name, toast]);

  // Widget content
  const renderContent = () => {
    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Fehler beim Laden der Portfolio-Daten
          </AlertDescription>
        </Alert>
      );
    }

    if (currentLevelData.children.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <Map className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Keine Daten für Treemap verfügbar</p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col space-y-3">
        {/* Navigation and Controls */}
        <div className="flex-shrink-0 space-y-2">
          {/* Breadcrumb Navigation */}
          <EnhancedTreemapBreadcrumb
            path={currentPath}
            rootName={treemapData.name}
            onNavigate={handleBreadcrumbNavigate}
            onReset={handleReset}
            compact={compact}
            showBackButton={true}
            showLevelIndicator={!compact}
          />

          {!compact && <Separator />}

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TreemapControls
              sizeMode={sizeMode}
              colorMode={colorMode}
              onSizeModeChange={setSizeMode}
              onColorModeChange={setColorMode}
              onReset={handleReset}
              onExport={handleExport}
              onSettings={onSettings}
              disabled={isExporting}
              compact={compact}
            />

            {!compact && (
              <CurrentModeIndicator
                sizeMode={sizeMode}
                colorMode={colorMode}
              />
            )}
          </div>

          {!compact && colorMode === "performance" && (
            <PerformanceLegend
              minPerformance={-0.1}
              maxPerformance={0.1}
            />
          )}
        </div>

        {/* Treemap Chart */}
        <div
          ref={treemapRef}
          className="flex-1 min-h-0 relative"
          data-treemap-container
        >
          <TreemapChart
            data={currentLevelData}
            sizeMode={sizeMode}
            colorMode={colorMode}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            className="w-full h-full"
          />

          {/* Loading overlay for export */}
          {isExporting && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Exportiere...</span>
              </div>
            </div>
          )}

          {/* Tooltip */}
          <TreemapTooltip tooltip={tooltip} />
        </div>
      </div>
    );
  };

  // Widget size based on compact mode
  const widgetSize = compact ? "medium" : "large";

  return (
    <WidgetContainer
      title="Portfolio Treemap"
      description={
        selectedPortfolio
          ? `${selectedPortfolio.name}${currentPath.length > 0 ? ` → ${currentPath.join(" → ")}` : ""}`
          : "Interaktive Portfolio-Visualisierung"
      }
      size={widgetSize}
      isLoading={isLoading}
      error={error instanceof Error ? error.message : null}
      onRefresh={onRefresh}
      onMaximize={onMaximize}
      onSettings={onSettings}
      data-widget-id="treemap"
    >
      {renderContent()}
    </WidgetContainer>
  );
}

export default TreemapWidget;