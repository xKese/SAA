import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, FileText, Settings, RotateCcw, User, LogOut, Briefcase } from "lucide-react";
import { Breadcrumb } from "@/components/common/Breadcrumb";

interface Portfolio {
  id: string;
  name: string;
  fileName: string;
  totalValue: string;
  positionCount: number;
  analysisStatus: string;
  createdAt?: string;
}

interface HeaderBarProps {
  selectedPortfolioId?: string | null;
  onPortfolioChange?: (portfolioId: string) => void;
  onRebalance?: () => void;
  onReport?: () => void;
  onSettings?: () => void;
  currentPath?: string;
}

export function HeaderBar({
  selectedPortfolioId,
  onPortfolioChange,
  onRebalance,
  onReport,
  onSettings,
  currentPath,
}: HeaderBarProps) {
  const { data: portfolios = [] } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolios"]
  });

  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo/App Name & Breadcrumbs */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold">Portfolio Analytics</h1>
              <p className="text-xs text-muted-foreground">Meeder & Seifer</p>
            </div>
          </div>

          {/* Breadcrumb Navigation */}
          <Breadcrumb className="hidden md:block" />
        </div>

        {/* Portfolio Selector */}
        <div className="flex-1 max-w-md mx-8">
          <Select
            value={selectedPortfolioId || ""}
            onValueChange={onPortfolioChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Portfolio auswählen..." />
            </SelectTrigger>
            <SelectContent>
              {portfolios.map((portfolio) => (
                <SelectItem key={portfolio.id} value={portfolio.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{portfolio.name}</span>
                    <span className="text-xs text-muted-foreground">
                      €{parseFloat(portfolio.totalValue).toLocaleString("de-DE")} • {portfolio.positionCount} Positionen
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quick Actions & User Menu */}
        <div className="flex items-center space-x-2">
          {/* Quick Actions */}
          <div className="flex items-center space-x-1 mr-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onRebalance}
              disabled={!selectedPortfolio}
              className="h-8"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Rebalance
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onReport}
              disabled={!selectedPortfolio}
              className="h-8"
            >
              <FileText className="h-4 w-4 mr-1" />
              Report
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onSettings}
              className="h-8"
            >
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </Button>
          </div>

          {/* User Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" alt="User" />
                  <AvatarFallback>MS</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Portfolio Manager</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    meeder.seifer@example.com
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSettings}>
                <User className="mr-2 h-4 w-4" />
                <span>Profil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSettings}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Einstellungen</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Abmelden</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}