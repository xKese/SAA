import React from "react";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Home, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TreemapBreadcrumbProps {
  path: string[];
  rootName: string;
  onNavigate: (targetPath: string[]) => void;
  onReset: () => void;
  className?: string;
  maxItems?: number;
}

export function TreemapBreadcrumb({
  path,
  rootName,
  onNavigate,
  onReset,
  className,
  maxItems = 4,
}: TreemapBreadcrumbProps) {
  // Build the full path including root
  const fullPath = [rootName, ...path];

  // Handle ellipsis when path is too long
  const shouldShowEllipsis = fullPath.length > maxItems;
  const visibleItems = shouldShowEllipsis
    ? [fullPath[0], "...", ...fullPath.slice(-2)]
    : fullPath;

  const handleItemClick = (index: number) => {
    if (index === 0) {
      // Root item - reset to top level
      onReset();
      return;
    }

    if (shouldShowEllipsis && index === 1 && visibleItems[1] === "...") {
      // Clicked on ellipsis - don't navigate
      return;
    }

    // Calculate the actual path index
    let actualIndex: number;
    if (shouldShowEllipsis && index > 1) {
      // Adjust for ellipsis
      actualIndex = fullPath.length - (visibleItems.length - index);
    } else {
      actualIndex = index;
    }

    // Navigate to the selected level
    const targetPath = fullPath.slice(1, actualIndex + 1);
    onNavigate(targetPath);
  };

  const isCurrentLevel = (index: number): boolean => {
    if (shouldShowEllipsis && index === 1 && visibleItems[1] === "...") {
      return false;
    }
    return index === visibleItems.length - 1;
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {/* Reset Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        className="h-8 px-2"
        title="Zurück zur Übersicht"
      >
        <Home className="h-4 w-4" />
      </Button>

      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          {visibleItems.map((item, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                {item === "..." ? (
                  <BreadcrumbEllipsis className="h-4 w-4" />
                ) : isCurrentLevel(index) ? (
                  <BreadcrumbPage className="font-medium text-foreground">
                    {item}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    asChild
                    className="cursor-pointer hover:text-foreground transition-colors"
                  >
                    <button
                      onClick={() => handleItemClick(index)}
                      className="flex items-center"
                    >
                      {index === 0 && <Home className="h-3 w-3 mr-1" />}
                      <span className="truncate max-w-[120px]">{item}</span>
                    </button>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>

              {/* Separator */}
              {index < visibleItems.length - 1 && (
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
              )}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Path Info */}
      {path.length > 0 && (
        <div className="text-xs text-muted-foreground ml-4">
          Level {path.length + 1}
        </div>
      )}
    </div>
  );
}

// Enhanced breadcrumb with additional features
interface EnhancedTreemapBreadcrumbProps extends TreemapBreadcrumbProps {
  showLevelIndicator?: boolean;
  showBackButton?: boolean;
  compactMode?: boolean;
}

export function EnhancedTreemapBreadcrumb({
  path,
  rootName,
  onNavigate,
  onReset,
  className,
  maxItems = 4,
  showLevelIndicator = true,
  showBackButton = true,
  compactMode = false,
}: EnhancedTreemapBreadcrumbProps) {
  const handleBackClick = () => {
    if (path.length === 0) {
      onReset();
    } else {
      const parentPath = path.slice(0, -1);
      onNavigate(parentPath);
    }
  };

  const canGoBack = path.length > 0;

  if (compactMode) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        {showBackButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackClick}
            disabled={!canGoBack}
            className="h-8 px-2"
            title={canGoBack ? "Zurück" : "Bereits auf oberster Ebene"}
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-8 px-2"
          title="Zurück zur Übersicht"
        >
          <Home className="h-4 w-4" />
        </Button>

        <span className="text-sm font-medium truncate max-w-[200px]">
          {path.length > 0 ? path[path.length - 1] : rootName}
        </span>

        {showLevelIndicator && path.length > 0 && (
          <span className="text-xs text-muted-foreground">
            L{path.length + 1}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        {showBackButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackClick}
            disabled={!canGoBack}
            className="h-8 px-2 flex-shrink-0"
            title={canGoBack ? "Eine Ebene zurück" : "Bereits auf oberster Ebene"}
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            <span className="ml-1 hidden sm:inline">Zurück</span>
          </Button>
        )}

        <TreemapBreadcrumb
          path={path}
          rootName={rootName}
          onNavigate={onNavigate}
          onReset={onReset}
          maxItems={maxItems}
          className="flex-1 min-w-0"
        />
      </div>

      {showLevelIndicator && (
        <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
          <span className="text-xs text-muted-foreground">
            Ebene {path.length + 1} von {maxItems}
          </span>
        </div>
      )}
    </div>
  );
}

export default TreemapBreadcrumb;