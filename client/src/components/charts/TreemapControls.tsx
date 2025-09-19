import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Palette,
  Maximize2,
  RotateCcw,
  Settings,
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileImage,
  FileText,
} from "lucide-react";
import { TreemapSizeMode, TreemapColorMode } from "@/types/treemap";
import { cn } from "@/lib/utils";

interface TreemapControlsProps {
  sizeMode: TreemapSizeMode;
  colorMode: TreemapColorMode;
  onSizeModeChange: (mode: TreemapSizeMode) => void;
  onColorModeChange: (mode: TreemapColorMode) => void;
  onReset: () => void;
  onExport: (format: "png" | "svg") => void;
  onSettings?: () => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

export function TreemapControls({
  sizeMode,
  colorMode,
  onSizeModeChange,
  onColorModeChange,
  onReset,
  onExport,
  onSettings,
  disabled = false,
  className,
  compact = false,
}: TreemapControlsProps) {
  const sizeModeOptions = [
    { value: "value" as const, label: "Wert", icon: BarChart3 },
    { value: "performance" as const, label: "Performance", icon: TrendingUp },
    { value: "weight" as const, label: "Gewichtung", icon: Maximize2 },
  ];

  const colorModeOptions = [
    { value: "performance" as const, label: "Performance", icon: TrendingUp },
    { value: "assetClass" as const, label: "Asset-Klasse", icon: Palette },
    { value: "region" as const, label: "Region", icon: Palette },
  ];

  if (compact) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        {/* Size Mode Selector */}
        <Select
          value={sizeMode}
          onValueChange={onSizeModeChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-32 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sizeModeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center space-x-2">
                  <option.icon className="h-4 w-4" />
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Color Mode Selector */}
        <Select
          value={colorMode}
          onValueChange={onColorModeChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-32 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {colorModeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center space-x-2">
                  <option.icon className="h-4 w-4" />
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={disabled}
            className="h-8 px-2"
            title="Zurücksetzen"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                className="h-8 px-2"
                title="Exportieren"
              >
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExport("png")}>
                <FileImage className="mr-2 h-4 w-4" />
                PNG exportieren
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("svg")}>
                <FileText className="mr-2 h-4 w-4" />
                SVG exportieren
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {onSettings && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSettings}
              disabled={disabled}
              className="h-8 px-2"
              title="Einstellungen"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-4", className)}>
      {/* Size Configuration */}
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-muted-foreground">
          Größe:
        </label>
        <div className="flex items-center space-x-1">
          {sizeModeOptions.map((option) => (
            <Button
              key={option.value}
              variant={sizeMode === option.value ? "default" : "ghost"}
              size="sm"
              onClick={() => onSizeModeChange(option.value)}
              disabled={disabled}
              className="h-8 px-3"
            >
              <option.icon className="h-4 w-4 mr-1" />
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Color Configuration */}
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-muted-foreground">
          Farbe:
        </label>
        <div className="flex items-center space-x-1">
          {colorModeOptions.map((option) => (
            <Button
              key={option.value}
              variant={colorMode === option.value ? "default" : "ghost"}
              size="sm"
              onClick={() => onColorModeChange(option.value)}
              disabled={disabled}
              className="h-8 px-3"
            >
              <option.icon className="h-4 w-4 mr-1" />
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={disabled}
          className="h-8"
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Zurücksetzen
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              className="h-8"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Format auswählen</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onExport("png")}>
              <FileImage className="mr-2 h-4 w-4" />
              <div>
                <div className="font-medium">PNG</div>
                <div className="text-xs text-muted-foreground">
                  Für Präsentationen
                </div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("svg")}>
              <FileText className="mr-2 h-4 w-4" />
              <div>
                <div className="font-medium">SVG</div>
                <div className="text-xs text-muted-foreground">
                  Für Vektorgrafiken
                </div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {onSettings && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSettings}
            disabled={disabled}
            className="h-8 px-2"
            title="Einstellungen"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Performance Legend Component
interface PerformanceLegendProps {
  minPerformance: number;
  maxPerformance: number;
  className?: string;
}

export function PerformanceLegend({
  minPerformance,
  maxPerformance,
  className,
}: PerformanceLegendProps) {
  const steps = 5;
  const stepSize = (maxPerformance - minPerformance) / (steps - 1);

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <span className="text-xs text-muted-foreground">Performance:</span>

      <div className="flex items-center space-x-1">
        {Array.from({ length: steps }, (_, i) => {
          const value = minPerformance + i * stepSize;
          const percentage = (value * 100).toFixed(0);

          let colorClass = "bg-gray-500";
          if (value < 0) {
            colorClass = `bg-red-${Math.min(900, 400 + Math.abs(value) * 500)}`;
          } else if (value > 0) {
            colorClass = `bg-green-${Math.min(900, 400 + value * 500)}`;
          }

          return (
            <div key={i} className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded ${colorClass}`} />
              <span className="text-xs text-muted-foreground mt-1">
                {value >= 0 ? '+' : ''}{percentage}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Current Mode Indicator
interface CurrentModeIndicatorProps {
  sizeMode: TreemapSizeMode;
  colorMode: TreemapColorMode;
  className?: string;
}

export function CurrentModeIndicator({
  sizeMode,
  colorMode,
  className,
}: CurrentModeIndicatorProps) {
  const getSizeModeLabel = (mode: TreemapSizeMode) => {
    switch (mode) {
      case "value": return "Wert";
      case "performance": return "Performance";
      case "weight": return "Gewichtung";
    }
  };

  const getColorModeLabel = (mode: TreemapColorMode) => {
    switch (mode) {
      case "performance": return "Performance";
      case "assetClass": return "Asset-Klasse";
      case "region": return "Region";
    }
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Badge variant="secondary" className="text-xs">
        Größe: {getSizeModeLabel(sizeMode)}
      </Badge>
      <Badge variant="secondary" className="text-xs">
        Farbe: {getColorModeLabel(colorMode)}
      </Badge>
    </div>
  );
}

export default TreemapControls;