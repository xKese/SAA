import { HierarchyNode } from "d3-hierarchy";

// Base treemap node interface
export interface TreemapNode {
  name: string;
  value?: number;
  performance?: number;
  weight?: number; // Percentage of parent
  instrumentType?: string;
  isin?: string;
  currency?: string;
  children?: TreemapNode[];

  // Optional metadata
  metadata?: {
    sector?: string;
    region?: string;
    riskLevel?: "low" | "medium" | "high";
    lastUpdated?: Date;
  };
}

// Extended node with D3 computed properties
export interface TreemapD3Node extends TreemapNode {
  // D3 hierarchy computed properties
  parent?: TreemapD3Node;
  depth?: number;
  height?: number;

  // D3 treemap layout properties
  x0?: number;
  y0?: number;
  x1?: number;
  y1?: number;

  // Calculated display properties
  displayValue?: string;
  displayPerformance?: string;
  color?: string;
  textColor?: string;
  fontSize?: number;
}

// Root treemap data structure
export interface TreemapData {
  name: string;
  totalValue: number;
  baseCurrency: string;
  lastUpdated: Date;
  children: TreemapNode[];
}

// Treemap configuration
export interface TreemapConfig {
  width: number;
  height: number;
  padding: number;
  minNodeSize: number;
  maxDepth: number;

  // Visual settings
  borderWidth: number;
  borderRadius: number;

  // Color scheme settings
  performanceColorScale: {
    min: number; // e.g., -0.1 for -10%
    max: number; // e.g., 0.1 for +10%
    colors: {
      negative: string; // Red color for negative performance
      neutral: string;  // Gray color for neutral performance
      positive: string; // Green color for positive performance
    };
  };

  // Animation settings
  transitionDuration: number;

  // Text settings
  minFontSize: number;
  maxFontSize: number;
  fontFamily: string;
}

// Treemap view modes
export type TreemapSizeMode = "value" | "performance" | "weight";
export type TreemapColorMode = "performance" | "assetClass" | "region";

// Treemap state management
export interface TreemapState {
  currentPath: string[]; // Breadcrumb path
  currentData: TreemapData;
  selectedNode: TreemapD3Node | null;
  hoveredNode: TreemapD3Node | null;
  sizeMode: TreemapSizeMode;
  colorMode: TreemapColorMode;
  zoomLevel: number;
}

// Treemap event handlers
export interface TreemapEventHandlers {
  onNodeClick?: (node: TreemapD3Node, event: MouseEvent) => void;
  onNodeHover?: (node: TreemapD3Node | null, event: MouseEvent | null) => void;
  onBreadcrumbClick?: (path: string[]) => void;
  onReset?: () => void;
  onExport?: (format: "png" | "svg") => void;
}

// Tooltip data structure
export interface TreemapTooltipData {
  name: string;
  value: string;
  performance: string;
  weight: string;
  metadata?: {
    sector?: string;
    region?: string;
    instrumentType?: string;
    isin?: string;
  };
  position: {
    x: number;
    y: number;
  };
}

// Export options
export interface TreemapExportOptions {
  format: "png" | "svg";
  filename?: string;
  quality?: number; // For PNG export
  scale?: number;   // For high-DPI export
  includeWatermark?: boolean;
}

// Data transformation options
export interface TreemapTransformOptions {
  groupBy: "assetClass" | "region" | "sector" | "currency";
  minGroupSize: number; // Minimum value to create separate group
  maxGroups: number;    // Maximum number of groups at each level
  includeOthers: boolean; // Group small items into "Others"
}

// Portfolio data interface (from existing schema)
export interface PortfolioData {
  id: string;
  name: string;
  totalValue: string;
  analysisResults?: {
    assetAllocation?: Record<string, number>;
    geographicAllocation?: Record<string, number>;
    positions?: Array<{
      name: string;
      value: number;
      weight: number;
      isin?: string;
      instrumentType?: string;
      performance?: number;
      sector?: string;
      region?: string;
    }>;
  };
}

// D3 hierarchy node type alias for better type safety
export type D3HierarchyNode = HierarchyNode<TreemapD3Node>;

// Utility types for better type inference
export type TreemapNodePath = string[];
export type TreemapDimensions = { width: number; height: number };
export type TreemapMargins = { top: number; right: number; bottom: number; left: number };

// Default configuration
export const DEFAULT_TREEMAP_CONFIG: TreemapConfig = {
  width: 800,
  height: 600,
  padding: 2,
  minNodeSize: 20,
  maxDepth: 3,
  borderWidth: 1,
  borderRadius: 4,
  performanceColorScale: {
    min: -0.1,
    max: 0.1,
    colors: {
      negative: "#ef4444", // red-500
      neutral: "#6b7280",  // gray-500
      positive: "#22c55e", // green-500
    },
  },
  transitionDuration: 750,
  minFontSize: 10,
  maxFontSize: 16,
  fontFamily: "Inter, sans-serif",
};

// Asset class color mapping for alternative color mode
export const ASSET_CLASS_COLORS: Record<string, string> = {
  "Aktien": "#3b82f6",     // blue-500
  "Anleihen": "#8b5cf6",   // violet-500
  "Immobilien": "#f59e0b", // amber-500
  "Rohstoffe": "#ef4444",  // red-500
  "Cash": "#22c55e",       // green-500
  "Alternative": "#06b6d4", // cyan-500
  "Sonstige": "#6b7280",   // gray-500
};