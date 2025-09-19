import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  BarChart3,
  Building2,
  Zap,
  RotateCcw,
  TrendingUp,
  FileText,
  Settings,
  PieChart,
  Shield,
  Briefcase,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

interface NavigationGroup {
  title: string;
  items: NavigationItem[];
}

interface SideNavigationProps {
  currentPath?: string;
}

export function SideNavigation({ currentPath }: SideNavigationProps = {}) {
  const location = useLocation();
  const actualCurrentPath = currentPath || location.pathname;

  // Navigation items configuration
  const navigationGroups: NavigationGroup[] = [
    {
      title: "Overview",
      items: [
        {
          path: "/",
          label: "Dashboard",
          icon: BarChart3,
          description: "Portfolio overview and key metrics"
        },
      ],
    },
    {
      title: "Portfolio Management",
      items: [
        {
          path: "/portfolio",
          label: "Portfolio Construction",
          icon: Briefcase,
          description: "Build and construct portfolios"
        },
        {
          path: "/optimization",
          label: "Optimization",
          icon: Zap,
          description: "Portfolio optimization tools"
        },
        {
          path: "/rebalancing",
          label: "Rebalancing",
          icon: RefreshCw,
          description: "Portfolio rebalancing strategies"
        },
      ],
    },
    {
      title: "Analysis",
      items: [
        {
          path: "/analyzer",
          label: "Portfolio Analyzer",
          icon: PieChart,
          description: "Analyze portfolio compositions"
        },
        {
          path: "/risk",
          label: "Risk Analysis",
          icon: Shield,
          description: "Risk metrics and analytics"
        },
      ],
    },
    {
      title: "Reporting",
      items: [
        {
          path: "/reports",
          label: "Reports",
          icon: FileText,
          description: "Generate portfolio reports"
        },
      ],
    },
  ];

  const settingsItems: NavigationItem[] = [
    {
      path: "/settings",
      label: "Settings",
      icon: Settings,
      description: "Application settings"
    },
  ];

  const isActiveRoute = (itemPath: string): boolean => {
    if (itemPath === "/") {
      return actualCurrentPath === "/" || actualCurrentPath === "/dashboard";
    }
    return actualCurrentPath === itemPath;
  };

  return (
    <Sidebar collapsible="icon" className="overflow-hidden">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-1">
          <BarChart3 className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm group-data-[collapsible=icon]:hidden">
            Portfolio Analytics
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navigationGroups.map((group, index) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = isActiveRoute(item.path);
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.description || item.label}
                        className={cn(
                          "transition-colors duration-200",
                          isActive && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        <Link to={item.path} className="flex items-center gap-2">
                          <item.icon className={cn(
                            "h-4 w-4 transition-colors duration-200",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )} />
                          <span className={cn(
                            "transition-colors duration-200",
                            isActive ? "text-primary" : "text-foreground"
                          )}>
                            {item.label}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
            {index < navigationGroups.length - 1 && <SidebarSeparator className="my-1" />}
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          {settingsItems.map((item) => {
            const isActive = isActiveRoute(item.path);
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.description || item.label}
                  className={cn(
                    "transition-colors duration-200",
                    isActive && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <Link to={item.path} className="flex items-center gap-2">
                    <item.icon className={cn(
                      "h-4 w-4 transition-colors duration-200",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "transition-colors duration-200",
                      isActive ? "text-primary" : "text-foreground"
                    )}>
                      {item.label}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}