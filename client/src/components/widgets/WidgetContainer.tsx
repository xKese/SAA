import { ReactNode, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, RefreshCw, Settings, Maximize2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type WidgetSize = "small" | "medium" | "large";

interface WidgetContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  size: WidgetSize;
  isLoading?: boolean;
  error?: string | null;
  className?: string;

  // Widget actions
  onRefresh?: () => void;
  onSettings?: () => void;
  onMaximize?: () => void;
  onRemove?: () => void;

  // Drag & Drop preparation
  "data-widget-id"?: string;
  draggable?: boolean;

  // Custom header actions
  headerActions?: ReactNode;

  // Widget state
  lastUpdated?: Date;
}

export function WidgetContainer({
  title,
  description,
  children,
  size,
  isLoading = false,
  error = null,
  className,
  onRefresh,
  onSettings,
  onMaximize,
  onRemove,
  "data-widget-id": dataWidgetId,
  draggable = false,
  headerActions,
  lastUpdated,
}: WidgetContainerProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    if (!draggable || !dataWidgetId) return;
    e.dataTransfer.setData("text/plain", dataWidgetId);
    e.dataTransfer.effectAllowed = "move";
  };

  const hasActions = onRefresh || onSettings || onMaximize || onRemove;

  return (
    <Card
      className={cn(
        "relative h-full flex flex-col",
        "transition-all duration-200 ease-in-out",
        isHovered && "shadow-lg",
        draggable && "cursor-move",
        className
      )}
      data-widget-id={dataWidgetId}
      data-widget-size={size}
      draggable={draggable}
      onDragStart={handleDragStart}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Widget Header */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate">
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="text-sm mt-1 line-clamp-2">
                {description}
              </CardDescription>
            )}
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                Zuletzt aktualisiert: {lastUpdated.toLocaleTimeString("de-DE")}
              </p>
            )}
          </div>

          {/* Header Actions */}
          <div className="flex items-center space-x-1 ml-2">
            {headerActions}

            {hasActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {onRefresh && (
                    <DropdownMenuItem onClick={onRefresh}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Aktualisieren
                    </DropdownMenuItem>
                  )}
                  {onMaximize && (
                    <DropdownMenuItem onClick={onMaximize}>
                      <Maximize2 className="mr-2 h-4 w-4" />
                      Vergrößern
                    </DropdownMenuItem>
                  )}
                  {onSettings && (
                    <DropdownMenuItem onClick={onSettings}>
                      <Settings className="mr-2 h-4 w-4" />
                      Einstellungen
                    </DropdownMenuItem>
                  )}
                  {onRemove && (
                    <DropdownMenuItem onClick={onRemove} className="text-destructive">
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Entfernen
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Widget Content */}
      <CardContent className="flex-1 pt-0 overflow-hidden">
        {error ? (
          <Alert variant="destructive" className="h-full flex items-center">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        ) : isLoading ? (
          <WidgetSkeleton size={size} />
        ) : (
          <div className="h-full overflow-auto">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Loading skeleton component for widgets
function WidgetSkeleton({ size }: { size: WidgetSize }) {
  const getSkeletonContent = () => {
    switch (size) {
      case "small":
        return (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        );
      case "medium":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-32 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        );
      case "large":
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-48 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-full max-w-sm">
        {getSkeletonContent()}
      </div>
    </div>
  );
}

// Higher-order component for widget error boundaries
export function withWidgetErrorBoundary<T extends object>(
  WrappedComponent: React.ComponentType<T>
) {
  return function WidgetWithErrorBoundary(props: T) {
    try {
      return <WrappedComponent {...props} />;
    } catch (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Widget konnte nicht geladen werden: {error instanceof Error ? error.message : "Unbekannter Fehler"}
          </AlertDescription>
        </Alert>
      );
    }
  };
}

export default WidgetContainer;