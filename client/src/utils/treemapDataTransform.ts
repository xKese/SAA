import {
  TreemapData,
  TreemapNode,
  PortfolioData,
  TreemapTransformOptions,
  ASSET_CLASS_COLORS,
  DEFAULT_TREEMAP_CONFIG
} from "@/types/treemap";

/**
 * Transform portfolio data into treemap format
 */
export function transformPortfolioToTreemap(
  portfolio: PortfolioData,
  options: Partial<TreemapTransformOptions> = {}
): TreemapData {
  const defaultOptions: TreemapTransformOptions = {
    groupBy: "assetClass",
    minGroupSize: 0.01, // 1% minimum
    maxGroups: 8,
    includeOthers: true,
  };

  const opts = { ...defaultOptions, ...options };

  if (!portfolio.analysisResults?.positions) {
    return generateSimulatedTreemapData();
  }

  const totalValue = parseFloat(portfolio.totalValue);
  const positions = portfolio.analysisResults.positions;

  // Group positions by the specified criteria
  const groupedPositions = groupPositions(positions, opts);

  // Create treemap nodes
  const children: TreemapNode[] = Object.entries(groupedPositions).map(([groupName, groupPositions]) => {
    const groupValue = groupPositions.reduce((sum, pos) => sum + pos.value, 0);
    const groupPerformance = calculateWeightedPerformance(groupPositions);

    // Create child nodes for individual positions
    const positionNodes: TreemapNode[] = groupPositions.map(position => ({
      name: position.name,
      value: position.value,
      performance: position.performance || 0,
      weight: (position.value / totalValue) * 100,
      instrumentType: position.instrumentType,
      isin: position.isin,
      metadata: {
        sector: position.sector,
        region: position.region,
      },
    }));

    return {
      name: groupName,
      value: groupValue,
      performance: groupPerformance,
      weight: (groupValue / totalValue) * 100,
      children: positionNodes,
      metadata: {
        sector: groupName,
      },
    };
  });

  return {
    name: portfolio.name,
    totalValue,
    baseCurrency: "EUR",
    lastUpdated: new Date(),
    children: children.sort((a, b) => (b.value || 0) - (a.value || 0)),
  };
}

/**
 * Group positions by specified criteria
 */
function groupPositions(
  positions: any[],
  options: TreemapTransformOptions
): Record<string, any[]> {
  const groups: Record<string, any[]> = {};

  positions.forEach(position => {
    let groupKey: string;

    switch (options.groupBy) {
      case "assetClass":
        groupKey = position.instrumentType || "Sonstige";
        break;
      case "region":
        groupKey = position.region || "Unbekannt";
        break;
      case "sector":
        groupKey = position.sector || "Sonstige";
        break;
      case "currency":
        groupKey = position.currency || "EUR";
        break;
      default:
        groupKey = "Sonstige";
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(position);
  });

  // Handle minimum group size and max groups
  return consolidateSmallGroups(groups, options);
}

/**
 * Consolidate small groups into "Others" category
 */
function consolidateSmallGroups(
  groups: Record<string, any[]>,
  options: TreemapTransformOptions
): Record<string, any[]> {
  const totalValue = Object.values(groups)
    .flat()
    .reduce((sum, pos) => sum + pos.value, 0);

  const minValue = totalValue * options.minGroupSize;
  const sortedGroups = Object.entries(groups)
    .map(([name, positions]) => ({
      name,
      positions,
      value: positions.reduce((sum, pos) => sum + pos.value, 0),
    }))
    .sort((a, b) => b.value - a.value);

  const result: Record<string, any[]> = {};
  const othersPositions: any[] = [];

  // Keep top groups and consolidate small ones
  for (let i = 0; i < sortedGroups.length; i++) {
    const group = sortedGroups[i];

    if (
      i < options.maxGroups &&
      group.value >= minValue
    ) {
      result[group.name] = group.positions;
    } else if (options.includeOthers) {
      othersPositions.push(...group.positions);
    }
  }

  // Add "Others" group if it has content
  if (othersPositions.length > 0 && options.includeOthers) {
    result["Sonstige"] = othersPositions;
  }

  return result;
}

/**
 * Calculate weighted average performance for a group
 */
function calculateWeightedPerformance(positions: any[]): number {
  const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);

  if (totalValue === 0) return 0;

  const weightedSum = positions.reduce((sum, pos) => {
    const performance = pos.performance || 0;
    const weight = pos.value / totalValue;
    return sum + (performance * weight);
  }, 0);

  return weightedSum;
}

/**
 * Generate simulated treemap data for demonstration
 */
export function generateSimulatedTreemapData(): TreemapData {
  const baseValue = 1000000; // €1M portfolio

  return {
    name: "Beispiel Portfolio",
    totalValue: baseValue,
    baseCurrency: "EUR",
    lastUpdated: new Date(),
    children: [
      {
        name: "Aktien",
        value: baseValue * 0.65,
        performance: 0.08,
        weight: 65,
        children: [
          {
            name: "US Technologie",
            value: baseValue * 0.25,
            performance: 0.12,
            weight: 25,
            children: [
              { name: "Apple Inc.", value: baseValue * 0.08, performance: 0.15, weight: 8, isin: "US0378331005" },
              { name: "Microsoft Corp.", value: baseValue * 0.07, performance: 0.10, weight: 7, isin: "US5949181045" },
              { name: "NVIDIA Corp.", value: baseValue * 0.05, performance: 0.18, weight: 5, isin: "US67066G1040" },
              { name: "Amazon.com Inc.", value: baseValue * 0.05, performance: 0.05, weight: 5, isin: "US0231351067" },
            ],
          },
          {
            name: "Europäische Aktien",
            value: baseValue * 0.20,
            performance: 0.05,
            weight: 20,
            children: [
              { name: "ASML Holding", value: baseValue * 0.06, performance: 0.08, weight: 6, isin: "NL0010273215" },
              { name: "SAP SE", value: baseValue * 0.05, performance: 0.03, weight: 5, isin: "DE0007164600" },
              { name: "Nestlé SA", value: baseValue * 0.04, performance: 0.04, weight: 4, isin: "CH0038863350" },
              { name: "LVMH", value: baseValue * 0.05, performance: 0.06, weight: 5, isin: "FR0000121014" },
            ],
          },
          {
            name: "Emerging Markets",
            value: baseValue * 0.20,
            performance: 0.03,
            weight: 20,
            children: [
              { name: "Taiwan Semiconductor", value: baseValue * 0.08, performance: 0.02, weight: 8, isin: "US8740391003" },
              { name: "Tencent Holdings", value: baseValue * 0.06, performance: 0.05, weight: 6, isin: "KYG875721634" },
              { name: "Alibaba Group", value: baseValue * 0.06, performance: 0.02, weight: 6, isin: "US01609W1027" },
            ],
          },
        ],
      },
      {
        name: "Anleihen",
        value: baseValue * 0.25,
        performance: 0.02,
        weight: 25,
        children: [
          {
            name: "Staatsanleihen",
            value: baseValue * 0.15,
            performance: 0.015,
            weight: 15,
            children: [
              { name: "Deutsche Bundesanleihen", value: baseValue * 0.08, performance: 0.01, weight: 8 },
              { name: "US Treasury Bonds", value: baseValue * 0.07, performance: 0.02, weight: 7 },
            ],
          },
          {
            name: "Unternehmensanleihen",
            value: baseValue * 0.10,
            performance: 0.03,
            weight: 10,
            children: [
              { name: "Investment Grade Bonds", value: baseValue * 0.07, performance: 0.025, weight: 7 },
              { name: "High Yield Bonds", value: baseValue * 0.03, performance: 0.04, weight: 3 },
            ],
          },
        ],
      },
      {
        name: "Immobilien",
        value: baseValue * 0.07,
        performance: 0.04,
        weight: 7,
        children: [
          { name: "REITs", value: baseValue * 0.05, performance: 0.045, weight: 5 },
          { name: "Immobilienfonds", value: baseValue * 0.02, performance: 0.035, weight: 2 },
        ],
      },
      {
        name: "Cash",
        value: baseValue * 0.03,
        performance: 0.005,
        weight: 3,
        children: [
          { name: "Tagesgeld", value: baseValue * 0.02, performance: 0.005, weight: 2 },
          { name: "Geldmarktfonds", value: baseValue * 0.01, performance: 0.005, weight: 1 },
        ],
      },
    ],
  };
}

/**
 * Calculate performance-based color
 */
export function calculatePerformanceColor(performance: number): string {
  const config = DEFAULT_TREEMAP_CONFIG.performanceColorScale;

  // Normalize performance to 0-1 scale
  const normalizedPerformance = Math.max(
    0,
    Math.min(1, (performance - config.min) / (config.max - config.min))
  );

  if (performance < 0) {
    // Red for negative performance
    const intensity = Math.abs(performance / config.min);
    return interpolateColor("#fee2e2", config.colors.negative, intensity);
  } else if (performance > 0) {
    // Green for positive performance
    const intensity = performance / config.max;
    return interpolateColor("#f0fdf4", config.colors.positive, intensity);
  } else {
    // Neutral gray
    return config.colors.neutral;
  }
}

/**
 * Get asset class color
 */
export function getAssetClassColor(assetClass: string): string {
  return ASSET_CLASS_COLORS[assetClass] || ASSET_CLASS_COLORS["Sonstige"];
}

/**
 * Interpolate between two colors
 */
function interpolateColor(color1: string, color2: string, factor: number): string {
  // Simple RGB interpolation
  const hex1 = color1.replace("#", "");
  const hex2 = color2.replace("#", "");

  const r1 = parseInt(hex1.substr(0, 2), 16);
  const g1 = parseInt(hex1.substr(2, 2), 16);
  const b1 = parseInt(hex1.substr(4, 2), 16);

  const r2 = parseInt(hex2.substr(0, 2), 16);
  const g2 = parseInt(hex2.substr(2, 2), 16);
  const b2 = parseInt(hex2.substr(4, 2), 16);

  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Validate treemap data structure
 */
export function validateTreemapData(data: TreemapData): boolean {
  try {
    if (!data.name || !data.children || !Array.isArray(data.children)) {
      return false;
    }

    function validateNode(node: TreemapNode): boolean {
      if (!node.name) return false;
      if (node.value !== undefined && (typeof node.value !== "number" || node.value < 0)) {
        return false;
      }
      if (node.children && !node.children.every(validateNode)) {
        return false;
      }
      return true;
    }

    return data.children.every(validateNode);
  } catch {
    return false;
  }
}

/**
 * Calculate text color based on background color
 */
export function getContrastTextColor(backgroundColor: string): string {
  // Convert hex to RGB
  const hex = backgroundColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black or white based on luminance
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

/**
 * Format value for display
 */
export function formatValue(value: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Calculate optimal font size based on node dimensions
 */
export function calculateFontSize(width: number, height: number, textLength: number): number {
  const minSize = DEFAULT_TREEMAP_CONFIG.minFontSize;
  const maxSize = DEFAULT_TREEMAP_CONFIG.maxFontSize;

  // Estimate text width (rough approximation)
  const estimatedTextWidth = textLength * 0.6; // Assume 0.6 ratio

  // Calculate size based on available space
  const widthBasedSize = (width * 0.8) / estimatedTextWidth * 12; // Base font size 12
  const heightBasedSize = height * 0.3; // 30% of height

  const calculatedSize = Math.min(widthBasedSize, heightBasedSize);

  return Math.max(minSize, Math.min(maxSize, calculatedSize));
}