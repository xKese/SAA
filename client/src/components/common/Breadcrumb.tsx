import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  path: string;
}

interface BreadcrumbProps {
  className?: string;
}

export function Breadcrumb({ className }: BreadcrumbProps) {
  const location = useLocation();

  const getBreadcrumbItems = (pathname: string): BreadcrumbItem[] => {
    const pathSegments = pathname.split("/").filter(segment => segment !== "");
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always include home
    breadcrumbs.push({
      label: "Dashboard",
      path: "/"
    });

    // Map path segments to readable names
    const pathMap: Record<string, string> = {
      "portfolio": "Portfolio Construction",
      "optimization": "Optimization",
      "rebalancing": "Rebalancing",
      "risk": "Risk Analysis",
      "reports": "Reports",
      "analyzer": "Portfolio Analyzer",
      "settings": "Settings",
      "dashboard": "Dashboard"
    };

    // Build breadcrumb path
    let currentPath = "";
    for (const segment of pathSegments) {
      currentPath += `/${segment}`;
      const label = pathMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

      // Don't duplicate dashboard
      if (segment !== "dashboard" || breadcrumbs.length === 0) {
        breadcrumbs.push({
          label,
          path: currentPath
        });
      }
    }

    // Remove duplicate dashboard entries
    const uniqueBreadcrumbs = breadcrumbs.filter((item, index, array) =>
      array.findIndex(b => b.path === item.path) === index
    );

    return uniqueBreadcrumbs;
  };

  const breadcrumbItems = getBreadcrumbItems(location.pathname);

  if (breadcrumbItems.length <= 1) {
    return null; // Don't show breadcrumbs for root/dashboard
  }

  return (
    <nav className={cn("flex items-center space-x-1 text-sm text-muted-foreground", className)}>
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;
        const isFirst = index === 0;

        return (
          <div key={item.path} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground/60" />
            )}

            {isLast ? (
              <span className="font-medium text-foreground flex items-center">
                {isFirst && <Home className="h-4 w-4 mr-1" />}
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="hover:text-foreground transition-colors flex items-center"
              >
                {isFirst && <Home className="h-4 w-4 mr-1" />}
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}