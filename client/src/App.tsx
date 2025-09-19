import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store/store";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PortfolioProvider } from "./contexts/PortfolioContext";
import { DashboardLayout } from "./layouts/DashboardLayout";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import PortfolioConstruction from "@/pages/PortfolioConstruction";
import Optimization from "@/pages/Optimization";
import Rebalancing from "@/pages/Rebalancing";
import RiskAnalysis from "@/pages/RiskAnalysis";
import Reports from "@/pages/Reports";
import PortfolioAnalyzer from "@/pages/portfolio-analyzer";

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="portfolio" element={<PortfolioConstruction />} />
          <Route path="optimization" element={<Optimization />} />
          <Route path="rebalancing" element={<Rebalancing />} />
          <Route path="risk" element={<RiskAnalysis />} />
          <Route path="reports" element={<Reports />} />
          <Route path="analyzer" element={<PortfolioAnalyzer />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <PortfolioProvider>
            <TooltipProvider>
              <Toaster />
              <ErrorBoundary>
                <Router />
              </ErrorBoundary>
            </TooltipProvider>
          </PortfolioProvider>
        </QueryClientProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
