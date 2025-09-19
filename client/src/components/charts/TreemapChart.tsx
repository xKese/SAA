import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";
import {
  TreemapData,
  TreemapD3Node,
  TreemapConfig,
  TreemapState,
  TreemapEventHandlers,
  TreemapTooltipData,
  TreemapSizeMode,
  TreemapColorMode,
  DEFAULT_TREEMAP_CONFIG,
} from "@/types/treemap";
import {
  calculatePerformanceColor,
  getAssetClassColor,
  getContrastTextColor,
  formatValue,
  formatPercentage,
  calculateFontSize,
} from "@/utils/treemapDataTransform";
import { cn } from "@/lib/utils";

interface TreemapChartProps {
  data: TreemapData;
  config?: Partial<TreemapConfig>;
  sizeMode?: TreemapSizeMode;
  colorMode?: TreemapColorMode;
  onNodeClick?: (node: TreemapD3Node, path: string[]) => void;
  onNodeHover?: (tooltip: TreemapTooltipData | null) => void;
  className?: string;
}

export function TreemapChart({
  data,
  config: configOverrides = {},
  sizeMode = "value",
  colorMode = "performance",
  onNodeClick,
  onNodeHover,
  className,
}: TreemapChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Merge configuration with defaults
  const config = useMemo(
    () => ({ ...DEFAULT_TREEMAP_CONFIG, ...configOverrides }),
    [configOverrides]
  );

  // Handle responsive resize
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width: width || 800, height: height || 600 });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // D3 treemap layout
  const treemapLayout = useMemo(() => {
    return d3
      .treemap<TreemapD3Node>()
      .size([dimensions.width, dimensions.height])
      .padding(config.padding)
      .round(true);
  }, [dimensions, config.padding]);

  // Create hierarchy and calculate layout
  const hierarchyData = useMemo(() => {
    const root = d3.hierarchy<TreemapD3Node>(data as TreemapD3Node);

    // Set value accessor based on size mode
    if (sizeMode === "value") {
      root.sum((d) => d.value || 0);
    } else if (sizeMode === "performance") {
      root.sum((d) => Math.abs(d.performance || 0) * (d.value || 0));
    } else {
      root.sum((d) => d.weight || 0);
    }

    // Calculate layout
    treemapLayout(root);

    return root;
  }, [data, treemapLayout, sizeMode]);

  // Get node color based on color mode
  const getNodeColor = useCallback(
    (node: TreemapD3Node): string => {
      if (colorMode === "performance") {
        return calculatePerformanceColor(node.performance || 0);
      } else if (colorMode === "assetClass") {
        return getAssetClassColor(node.instrumentType || node.name);
      } else {
        // Region mode - simplified to asset class for now
        return getAssetClassColor(node.metadata?.region || node.name);
      }
    },
    [colorMode]
  );

  // Handle node click
  const handleNodeClick = useCallback(
    (node: TreemapD3Node, event: MouseEvent) => {
      event.stopPropagation();

      if (node.children && node.children.length > 0) {
        // Build path to this node
        const path: string[] = [];
        let current: TreemapD3Node | undefined = node;
        while (current && current.data.name !== data.name) {
          path.unshift(current.data.name);
          current = current.parent?.data;
        }

        onNodeClick?.(node, path);
      }
    },
    [onNodeClick, data.name]
  );

  // Handle node hover
  const handleNodeHover = useCallback(
    (node: TreemapD3Node | null, event: MouseEvent | null) => {
      if (!node || !event) {
        onNodeHover?.(null);
        return;
      }

      const tooltip: TreemapTooltipData = {
        name: node.data.name,
        value: formatValue(node.data.value || 0),
        performance: formatPercentage(node.data.performance || 0),
        weight: formatPercentage((node.data.weight || 0) / 100),
        metadata: {
          instrumentType: node.data.instrumentType,
          isin: node.data.isin,
          sector: node.data.metadata?.sector,
          region: node.data.metadata?.region,
        },
        position: {
          x: event.clientX,
          y: event.clientY,
        },
      };

      onNodeHover?.(tooltip);
    },
    [onNodeHover]
  );

  // D3 rendering effect
  useEffect(() => {
    if (!svgRef.current || !hierarchyData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    // Create main group
    const g = svg.append("g");

    // Render leaf nodes
    const leaves = hierarchyData.leaves();

    const leaf = g
      .selectAll("g")
      .data(leaves)
      .join("g")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`)
      .style("cursor", (d) => (d.children ? "pointer" : "default"));

    // Add rectangles
    leaf
      .append("rect")
      .attr("id", (d) => `rect-${d.data.name.replace(/\s+/g, "-")}`)
      .attr("fill", (d) => getNodeColor(d.data))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", config.borderWidth)
      .attr("rx", config.borderRadius)
      .attr("ry", config.borderRadius)
      .attr("width", (d) => Math.max(0, (d.x1 || 0) - (d.x0 || 0)))
      .attr("height", (d) => Math.max(0, (d.y1 || 0) - (d.y0 || 0)))
      .on("click", function (event, d) {
        handleNodeClick(d.data, event);
      })
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("stroke-width", config.borderWidth + 1);
        handleNodeHover(d.data, event);
      })
      .on("mousemove", function (event, d) {
        handleNodeHover(d.data, event);
      })
      .on("mouseleave", function (event, d) {
        d3.select(this).attr("stroke-width", config.borderWidth);
        handleNodeHover(null, null);
      });

    // Add text labels
    leaf
      .append("text")
      .attr("clip-path", (d) => `url(#clip-${d.data.name.replace(/\s+/g, "-")})`)
      .selectAll("tspan")
      .data((d) => {
        const width = (d.x1 || 0) - (d.x0 || 0);
        const height = (d.y1 || 0) - (d.y0 || 0);

        if (width < 40 || height < 30) return []; // Too small for text

        const fontSize = calculateFontSize(width, height, d.data.name.length);

        const lines = [];

        // Add name (possibly wrapped)
        const words = d.data.name.split(/\s+/);
        if (words.length === 1 || width > 120) {
          lines.push({ text: d.data.name, fontSize, weight: "bold" });
        } else {
          // Split into multiple lines
          const mid = Math.ceil(words.length / 2);
          lines.push({ text: words.slice(0, mid).join(" "), fontSize, weight: "bold" });
          if (mid < words.length) {
            lines.push({ text: words.slice(mid).join(" "), fontSize, weight: "bold" });
          }
        }

        // Add value if there's space
        if (height > 50 && fontSize > config.minFontSize) {
          lines.push({
            text: formatValue(d.data.value || 0),
            fontSize: Math.max(config.minFontSize, fontSize - 2),
            weight: "normal",
          });
        }

        // Add performance if there's more space
        if (height > 70 && fontSize > config.minFontSize) {
          const performance = d.data.performance || 0;
          const perfText = performance >= 0 ? `+${formatPercentage(performance)}` : formatPercentage(performance);
          lines.push({
            text: perfText,
            fontSize: Math.max(config.minFontSize, fontSize - 2),
            weight: "normal",
          });
        }

        return lines;
      })
      .join("tspan")
      .attr("x", 4)
      .attr("y", (d, i) => 4 + (i + 1) * (d.fontSize + 2))
      .attr("font-size", (d) => `${d.fontSize}px`)
      .attr("font-weight", (d) => d.weight)
      .attr("font-family", config.fontFamily)
      .attr("fill", (d, i, nodes) => {
        const parent = d3.select(nodes[i].parentNode as Element);
        const rect = parent.select("rect");
        const fillColor = rect.node() ? rect.attr("fill") : "#000000";
        return getContrastTextColor(fillColor);
      })
      .text((d) => d.text);

    // Add clip paths for text overflow
    svg
      .append("defs")
      .selectAll("clipPath")
      .data(leaves)
      .join("clipPath")
      .attr("id", (d) => `clip-${d.data.name.replace(/\s+/g, "-")}`)
      .append("rect")
      .attr("width", (d) => Math.max(0, (d.x1 || 0) - (d.x0 || 0) - 8))
      .attr("height", (d) => Math.max(0, (d.y1 || 0) - (d.y0 || 0) - 8));

  }, [hierarchyData, getNodeColor, config, handleNodeClick, handleNodeHover]);

  return (
    <div
      ref={containerRef}
      className={cn("w-full h-full overflow-hidden", className)}
    >
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
        style={{ fontFamily: config.fontFamily }}
      >
        {/* SVG content will be rendered by D3 */}
      </svg>
    </div>
  );
}

export default TreemapChart;