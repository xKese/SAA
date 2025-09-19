// Interfaces für Claude-Analyse-Ergebnisse

export interface AssignedPosition {
  name: string;
  isin?: string;
  value: number;
  percentage: number;
}

export interface AnalysisResultItem {
  category?: string;
  region?: string;
  currency?: string;
  value: number;
  percentage: number;
  assignedPositions?: AssignedPosition[];
}

export interface AssetAllocation extends AnalysisResultItem {
  category: string;
  assignedPositions?: AssignedPosition[];
}

export interface GeographicAllocation extends AnalysisResultItem {
  region: string;
  assignedPositions?: AssignedPosition[];
}

export interface CurrencyExposure extends AnalysisResultItem {
  currency: string;
  assignedPositions?: AssignedPosition[];
}

export interface RiskMetrics {
  expectedReturn?: number;
  volatility?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  beta?: number;
  alpha?: number;
  informationRatio?: number;
  trackingError?: number;
  [key: string]: number | undefined;
}

export interface PortfolioAnalysisResult {
  assetAllocation?: AssetAllocation[];
  geographicAllocation?: GeographicAllocation[];
  currencyExposure?: CurrencyExposure[];
  riskMetrics?: RiskMetrics;
  summary?: string;
  rawAnalysis?: string;
  error?: string;
}

// Type Guards für Datenvalidierung
export function isValidAssetAllocation(data: any): data is AssetAllocation[] {
  return Array.isArray(data) && data.every(item => 
    typeof item === 'object' &&
    typeof item.category === 'string' &&
    typeof item.value === 'number' &&
    typeof item.percentage === 'number'
  );
}

export function isValidGeographicAllocation(data: any): data is GeographicAllocation[] {
  return Array.isArray(data) && data.every(item => 
    typeof item === 'object' &&
    typeof item.region === 'string' &&
    typeof item.value === 'number' &&
    typeof item.percentage === 'number'
  );
}

export function isValidCurrencyExposure(data: any): data is CurrencyExposure[] {
  return Array.isArray(data) && data.every(item => 
    typeof item === 'object' &&
    typeof item.currency === 'string' &&
    typeof item.value === 'number' &&
    typeof item.percentage === 'number'
  );
}

export function isValidRiskMetrics(data: any): data is RiskMetrics {
  return typeof data === 'object' && data !== null;
}

// Utility Functions
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
}

export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
  }).format(value / 100);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

// Chart-spezifische Farb-Palette
export const CHART_COLORS = {
  primary: [
    '#0ea5e9', // sky-500
    '#f59e0b', // amber-500
    '#10b981', // emerald-500
    '#f97316', // orange-500
    '#8b5cf6', // violet-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
    '#ef4444', // red-500
    '#ec4899', // pink-500
    '#6366f1', // indigo-500
  ],
  secondary: [
    '#0284c7', // sky-600
    '#d97706', // amber-600
    '#059669', // emerald-600
    '#ea580c', // orange-600
    '#7c3aed', // violet-600
    '#0891b2', // cyan-600
    '#65a30d', // lime-600
    '#dc2626', // red-600
    '#db2777', // pink-600
    '#4f46e5', // indigo-600
  ]
} as const;

export function getChartColor(index: number, palette: keyof typeof CHART_COLORS = 'primary'): string {
  const colors = CHART_COLORS[palette];
  return colors[index % colors.length];
}