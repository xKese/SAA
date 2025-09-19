import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { HeaderBar } from "../components/layout/HeaderBar";
import { SideNavigation } from "../components/layout/SideNavigation";
import { usePortfolio } from "../contexts/PortfolioContext";
import DashboardGrid, { DashboardGridItem } from "../components/layout/DashboardGrid";

// Import all widgets
import PortfolioValueWidget from "../components/widgets/PortfolioValueWidget";
import PerformanceChartWidget from "../components/widgets/PerformanceChartWidget";
import AssetAllocationPieWidget from "../components/widgets/AssetAllocationPieWidget";
import RiskMetricsWidget from "../components/widgets/RiskMetricsWidget";
import RecentTransactionsWidget from "../components/widgets/RecentTransactionsWidget";
import TreemapWidget from "../components/widgets/TreemapWidget";

interface DashboardLayoutProps {
  children?: React.ReactNode;
  showDefaultDashboard?: boolean;
}

export function DashboardLayout({ children, showDefaultDashboard = false }: DashboardLayoutProps) {
  const location = useLocation();
  const {
    selectedPortfolioId,
    setSelectedPortfolioId,
  } = usePortfolio();

  // Widget refresh handlers
  const handleRefreshPortfolioValue = () => {
    console.log("Refreshing portfolio value widget");
  };

  const handleRefreshPerformanceChart = () => {
    console.log("Refreshing performance chart widget");
  };

  const handleRefreshAssetAllocation = () => {
    console.log("Refreshing asset allocation widget");
  };

  const handleRefreshRiskMetrics = () => {
    console.log("Refreshing risk metrics widget");
  };

  const handleRefreshTransactions = () => {
    console.log("Refreshing transactions widget");
  };

  const handleRefreshTreemap = () => {
    console.log("Refreshing treemap widget");
  };

  // Header action handlers
  const handleRebalance = () => {
    console.log("Opening rebalance dialog");
  };

  const handleReport = () => {
    console.log("Generating portfolio report");
  };

  const handleSettings = () => {
    console.log("Opening settings");
  };

  const handleViewAllTransactions = () => {
    console.log("Opening transactions page");
  };

  const handleMaximizeWidget = (widgetType: string) => {
    console.log(`Maximizing ${widgetType} widget`);
  };

  // Check if we should show the default dashboard or use Outlet
  const isDashboardRoute = location.pathname === "/" || location.pathname === "/dashboard";
  const shouldShowDefaultDashboard = showDefaultDashboard || isDashboardRoute;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background dashboard-container">
        {/* Side Navigation */}
        <SideNavigation currentPath={location.pathname} />

        {/* Main Content Area */}
        <SidebarInset className="flex-1">
          {/* Header Bar */}
          <HeaderBar
            selectedPortfolioId={selectedPortfolioId}
            onPortfolioChange={setSelectedPortfolioId}
            onRebalance={handleRebalance}
            onReport={handleReport}
            onSettings={handleSettings}
            currentPath={location.pathname}
          />

          {/* Content Area */}
          <main className="flex-1 overflow-auto content-area">
            {shouldShowDefaultDashboard ? (
              children || (
                <DashboardGrid>
                  {/* Portfolio Value Widget - Medium */}
                  <DashboardGridItem size="medium" data-widget-id="portfolio-value">
                    <PortfolioValueWidget
                      selectedPortfolioId={selectedPortfolioId}
                      onRefresh={handleRefreshPortfolioValue}
                    />
                  </DashboardGridItem>

                  {/* Risk Metrics Widget - Small */}
                  <DashboardGridItem size="small" data-widget-id="risk-metrics">
                    <RiskMetricsWidget
                      selectedPortfolioId={selectedPortfolioId}
                      onRefresh={handleRefreshRiskMetrics}
                    />
                  </DashboardGridItem>

                  {/* Performance Chart Widget - Large */}
                  <DashboardGridItem size="large" data-widget-id="performance-chart">
                    <PerformanceChartWidget
                      selectedPortfolioId={selectedPortfolioId}
                      onRefresh={handleRefreshPerformanceChart}
                      onMaximize={() => handleMaximizeWidget("performance-chart")}
                    />
                  </DashboardGridItem>

                  {/* Asset Allocation Pie Widget - Medium */}
                  <DashboardGridItem size="medium" data-widget-id="asset-allocation">
                    <AssetAllocationPieWidget
                      selectedPortfolioId={selectedPortfolioId}
                      onRefresh={handleRefreshAssetAllocation}
                      onMaximize={() => handleMaximizeWidget("asset-allocation")}
                    />
                  </DashboardGridItem>

                  {/* Recent Transactions Widget - Medium */}
                  <DashboardGridItem size="medium" data-widget-id="recent-transactions">
                    <RecentTransactionsWidget
                      selectedPortfolioId={selectedPortfolioId}
                      onRefresh={handleRefreshTransactions}
                      onViewAll={handleViewAllTransactions}
                    />
                  </DashboardGridItem>

                  {/* Treemap Widget - Large */}
                  <DashboardGridItem size="large" data-widget-id="treemap">
                    <TreemapWidget
                      selectedPortfolioId={selectedPortfolioId}
                      onRefresh={handleRefreshTreemap}
                      onMaximize={() => handleMaximizeWidget("treemap")}
                      onSettings={handleSettings}
                    />
                  </DashboardGridItem>
                </DashboardGrid>
              )
            ) : (
              <Outlet />
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default DashboardLayout;