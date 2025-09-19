import html2canvas from "html2canvas";
import { TreemapExportOptions } from "@/types/treemap";

/**
 * Export treemap as PNG using html2canvas
 */
export async function exportTreemapAsPNG(
  element: HTMLElement,
  options: Partial<TreemapExportOptions> = {}
): Promise<void> {
  const defaultOptions: TreemapExportOptions = {
    format: "png",
    filename: `Portfolio_Treemap_${new Date().toISOString().split('T')[0]}.png`,
    quality: 1.0,
    scale: 2, // For high-DPI displays
    includeWatermark: true,
  };

  const opts = { ...defaultOptions, ...options };

  try {
    // Configure html2canvas options
    const canvas = await html2canvas(element, {
      scale: opts.scale || 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      width: element.offsetWidth,
      height: element.offsetHeight,
      onclone: (clonedDoc) => {
        // Ensure all styles are preserved in the clone
        const clonedElement = clonedDoc.querySelector('[data-treemap-container]');
        if (clonedElement) {
          (clonedElement as HTMLElement).style.background = '#ffffff';
        }
      },
    });

    // Add watermark if requested
    if (opts.includeWatermark) {
      addWatermarkToCanvas(canvas);
    }

    // Convert canvas to blob and download
    canvas.toBlob(
      (blob) => {
        if (blob) {
          downloadBlob(blob, opts.filename || defaultOptions.filename);
        }
      },
      "image/png",
      opts.quality
    );
  } catch (error) {
    console.error("Error exporting treemap as PNG:", error);
    throw new Error("Fehler beim Exportieren als PNG");
  }
}

/**
 * Export treemap as SVG
 */
export async function exportTreemapAsSVG(
  svgElement: SVGSVGElement,
  options: Partial<TreemapExportOptions> = {}
): Promise<void> {
  const defaultOptions: TreemapExportOptions = {
    format: "svg",
    filename: `Portfolio_Treemap_${new Date().toISOString().split('T')[0]}.svg`,
    includeWatermark: true,
  };

  const opts = { ...defaultOptions, ...options };

  try {
    // Clone the SVG element
    const svgClone = svgElement.cloneNode(true) as SVGSVGElement;

    // Ensure SVG has proper dimensions and namespace
    const bbox = svgElement.getBBox();
    svgClone.setAttribute("width", svgElement.getAttribute("width") || bbox.width.toString());
    svgClone.setAttribute("height", svgElement.getAttribute("height") || bbox.height.toString());
    svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svgClone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

    // Add background
    const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    background.setAttribute("width", "100%");
    background.setAttribute("height", "100%");
    background.setAttribute("fill", "#ffffff");
    svgClone.insertBefore(background, svgClone.firstChild);

    // Add watermark if requested
    if (opts.includeWatermark) {
      addWatermarkToSVG(svgClone);
    }

    // Extract CSS styles and embed them
    const styles = extractSVGStyles();
    if (styles) {
      const styleElement = document.createElementNS("http://www.w3.org/2000/svg", "style");
      styleElement.textContent = styles;
      const defs = svgClone.querySelector("defs") || document.createElementNS("http://www.w3.org/2000/svg", "defs");
      if (!svgClone.querySelector("defs")) {
        svgClone.insertBefore(defs, svgClone.firstChild);
      }
      defs.appendChild(styleElement);
    }

    // Serialize SVG to string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClone);

    // Add XML declaration and DOCTYPE
    const svgBlob = new Blob([
      '<?xml version="1.0" encoding="UTF-8"?>\n',
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n',
      svgString
    ], { type: "image/svg+xml" });

    downloadBlob(svgBlob, opts.filename || defaultOptions.filename);
  } catch (error) {
    console.error("Error exporting treemap as SVG:", error);
    throw new Error("Fehler beim Exportieren als SVG");
  }
}

/**
 * Add watermark to canvas
 */
function addWatermarkToCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const text = "Generated with Portfolio Analyzer";
  const fontSize = Math.max(12, canvas.width * 0.015);

  ctx.save();
  ctx.font = `${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";

  // Position watermark in bottom-right corner
  const padding = 10;
  ctx.fillText(
    text,
    canvas.width - padding,
    canvas.height - padding
  );

  ctx.restore();
}

/**
 * Add watermark to SVG
 */
function addWatermarkToSVG(svgElement: SVGSVGElement): void {
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");

  const width = parseFloat(svgElement.getAttribute("width") || "800");
  const height = parseFloat(svgElement.getAttribute("height") || "600");
  const fontSize = Math.max(12, width * 0.015);

  text.setAttribute("x", (width - 10).toString());
  text.setAttribute("y", (height - 10).toString());
  text.setAttribute("text-anchor", "end");
  text.setAttribute("font-family", "Arial, sans-serif");
  text.setAttribute("font-size", fontSize.toString());
  text.setAttribute("fill", "rgba(0, 0, 0, 0.3)");
  text.textContent = "Generated with Portfolio Analyzer";

  svgElement.appendChild(text);
}

/**
 * Extract relevant CSS styles for SVG export
 */
function extractSVGStyles(): string {
  const styleSheets = Array.from(document.styleSheets);
  let styles = "";

  try {
    for (const styleSheet of styleSheets) {
      try {
        const rules = Array.from(styleSheet.cssRules || []);

        for (const rule of rules) {
          if (rule instanceof CSSStyleRule) {
            // Only include styles that might affect SVG elements
            if (rule.selectorText && (
              rule.selectorText.includes("svg") ||
              rule.selectorText.includes("text") ||
              rule.selectorText.includes("rect") ||
              rule.selectorText.includes("treemap")
            )) {
              styles += rule.cssText + "\n";
            }
          }
        }
      } catch (e) {
        // Skip stylesheets that can't be accessed (CORS)
        console.warn("Could not access stylesheet:", e);
      }
    }
  } catch (e) {
    console.warn("Error extracting styles:", e);
  }

  return styles;
}

/**
 * Download blob as file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export treemap data as JSON
 */
export function exportTreemapDataAsJSON(
  data: any,
  filename: string = `Portfolio_Data_${new Date().toISOString().split('T')[0]}.json`
): void {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    downloadBlob(blob, filename);
  } catch (error) {
    console.error("Error exporting data as JSON:", error);
    throw new Error("Fehler beim Exportieren der Daten");
  }
}

/**
 * Export treemap configuration as JSON
 */
export function exportTreemapConfig(
  config: any,
  filename: string = `Treemap_Config_${new Date().toISOString().split('T')[0]}.json`
): void {
  try {
    const configData = {
      exportDate: new Date().toISOString(),
      version: "1.0",
      config,
    };

    const jsonString = JSON.stringify(configData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    downloadBlob(blob, filename);
  } catch (error) {
    console.error("Error exporting config:", error);
    throw new Error("Fehler beim Exportieren der Konfiguration");
  }
}

/**
 * Prepare element for export by ensuring it's ready
 */
export function prepareElementForExport(element: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    // Wait for any pending animations or layouts to complete
    requestAnimationFrame(() => {
      setTimeout(() => {
        // Ensure fonts are loaded
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(() => resolve());
        } else {
          resolve();
        }
      }, 100);
    });
  });
}

/**
 * Validate export options
 */
export function validateExportOptions(options: Partial<TreemapExportOptions>): boolean {
  try {
    if (options.format && !["png", "svg"].includes(options.format)) {
      return false;
    }

    if (options.quality && (options.quality < 0.1 || options.quality > 1.0)) {
      return false;
    }

    if (options.scale && (options.scale < 0.5 || options.scale > 5.0)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export default {
  exportTreemapAsPNG,
  exportTreemapAsSVG,
  exportTreemapDataAsJSON,
  exportTreemapConfig,
  prepareElementForExport,
  validateExportOptions,
};