import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardGridProps {
  children: ReactNode;
  className?: string;
}

interface DashboardGridItemProps {
  children: ReactNode;
  size: "small" | "medium" | "large";
  className?: string;
  "data-widget-id"?: string; // For future drag & drop functionality
}

export function DashboardGrid({ children, className }: DashboardGridProps) {
  return (
    <div
      className={cn(
        // Base grid setup with 12 columns
        "grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12",
        // Auto-fit rows with minimum height
        "auto-rows-[120px]",
        // Responsive gaps
        "gap-4 md:gap-6",
        // Padding for container
        "p-4 md:p-6",
        // Full width and height
        "w-full h-full",
        // Overflow handling
        "overflow-auto",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DashboardGridItem({
  children,
  size,
  className,
  "data-widget-id": dataWidgetId,
}: DashboardGridItemProps) {
  const sizeClasses = {
    // Small: 3x2 Grid Units (responsive)
    small: "col-span-4 md:col-span-4 lg:col-span-3 row-span-2",
    // Medium: 6x3 Grid Units (responsive)
    medium: "col-span-4 md:col-span-6 lg:col-span-6 row-span-3",
    // Large: 12x4 Grid Units (responsive)
    large: "col-span-4 md:col-span-8 lg:col-span-12 row-span-4",
  };

  return (
    <div
      className={cn(
        // Size-specific grid placement
        sizeClasses[size],
        // Basic styling
        "relative",
        // Animation for potential drag & drop
        "transition-all duration-200 ease-in-out",
        // Hover effects for interactivity indication
        "hover:scale-[1.01] hover:z-10",
        // Custom class overrides
        className
      )}
      data-widget-id={dataWidgetId}
      data-widget-size={size}
    >
      {children}
    </div>
  );
}

// Helper component for responsive grid debugging (development only)
export function GridDebugOverlay() {
  if (process.env.NODE_ENV !== "development") return null;

  const gridLines = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="absolute inset-0 pointer-events-none z-50 grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-4 md:gap-6 p-4 md:p-6">
      {gridLines.map((line) => (
        <div
          key={line}
          className={cn(
            "border border-red-200 bg-red-50/20 flex items-center justify-center text-xs font-mono text-red-600",
            line > 4 && "hidden md:block",
            line > 8 && "hidden lg:block"
          )}
        >
          {line}
        </div>
      ))}
    </div>
  );
}

// Utility function to calculate responsive grid spans
export function getResponsiveGridSpan(
  size: "small" | "medium" | "large",
  breakpoint: "mobile" | "tablet" | "desktop" = "desktop"
) {
  const spans = {
    small: { mobile: 4, tablet: 4, desktop: 3 },
    medium: { mobile: 4, tablet: 6, desktop: 6 },
    large: { mobile: 4, tablet: 8, desktop: 12 },
  };

  return spans[size][breakpoint];
}

// Export components as named exports
export { DashboardGridItem as GridItem };
export default DashboardGrid;