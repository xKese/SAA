import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpRight, ArrowDownLeft, Clock, Plus, TrendingUp } from "lucide-react";
import WidgetContainer from "./WidgetContainer";
import { cn } from "@/lib/utils";

interface Portfolio {
  id: string;
  name: string;
  totalValue: string;
  positionCount: number;
}

interface RecentTransactionsWidgetProps {
  selectedPortfolioId?: string | null;
  onRefresh?: () => void;
  onViewAll?: () => void;
}

interface Transaction {
  id: string;
  type: "buy" | "sell" | "dividend" | "rebalance";
  instrument: string;
  amount: number;
  quantity?: number;
  price?: number;
  date: Date;
  status: "completed" | "pending" | "failed";
}

// Transaction type translations and icons
const TRANSACTION_CONFIG = {
  buy: {
    label: "Kauf",
    icon: ArrowUpRight,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  sell: {
    label: "Verkauf",
    icon: ArrowDownLeft,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  dividend: {
    label: "Dividende",
    icon: TrendingUp,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  rebalance: {
    label: "Rebalancing",
    icon: Clock,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
};

export function RecentTransactionsWidget({
  selectedPortfolioId,
  onRefresh,
  onViewAll,
}: RecentTransactionsWidgetProps) {
  const { data: portfolios = [], isLoading, error } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolios"],
  });

  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);

  // Generate simulated transaction data
  const transactions = useMemo((): Transaction[] => {
    if (!selectedPortfolio) return [];

    const instruments = [
      "MSCI World ETF",
      "Emerging Markets ETF",
      "European Bonds ETF",
      "Apple Inc.",
      "Microsoft Corp.",
      "Amazon.com Inc.",
      "Tesla Inc.",
      "ASML Holding",
    ];

    const transactionTypes: Transaction["type"][] = ["buy", "sell", "dividend", "rebalance"];

    // Generate 8 recent transactions
    const generatedTransactions: Transaction[] = [];
    const now = new Date();

    for (let i = 0; i < 8; i++) {
      const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
      const instrument = instruments[Math.floor(Math.random() * instruments.length)];

      // Create date from 1-30 days ago
      const daysAgo = Math.floor(Math.random() * 30) + 1;
      const transactionDate = new Date(now);
      transactionDate.setDate(transactionDate.getDate() - daysAgo);

      const baseAmount = Math.random() * 50000 + 1000; // €1,000 - €51,000
      const price = Math.random() * 500 + 50; // €50 - €550 per share
      const quantity = Math.floor(baseAmount / price);

      generatedTransactions.push({
        id: `tx-${i + 1}`,
        type,
        instrument,
        amount: type === "dividend" ? baseAmount * 0.1 : baseAmount, // Dividends are smaller
        quantity: type === "dividend" ? undefined : quantity,
        price: type === "dividend" ? undefined : price,
        date: transactionDate,
        status: Math.random() > 0.1 ? "completed" : "pending", // 90% completed
      });
    }

    return generatedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [selectedPortfolio]);


  if (!selectedPortfolioId) {
    return (
      <WidgetContainer
        title="Letzte Transaktionen"
        description="Wählen Sie ein Portfolio aus"
        size="medium"
        data-widget-id="recent-transactions"
      >
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Kein Portfolio ausgewählt</p>
          </div>
        </div>
      </WidgetContainer>
    );
  }

  return (
    <WidgetContainer
      title="Letzte Transaktionen"
      description={selectedPortfolio?.name}
      size="medium"
      isLoading={isLoading}
      error={error instanceof Error ? error.message : null}
      onRefresh={onRefresh}
      data-widget-id="recent-transactions"
      headerActions={
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewAll}
          className="h-6 px-2 text-xs"
        >
          Alle anzeigen
        </Button>
      }
    >
      <div className="h-full flex flex-col">
        {transactions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Keine Transaktionen</p>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1">
              <div className="space-y-3">
                {transactions.slice(0, 6).map((transaction) => (
                  <TransactionItem key={transaction.id} transaction={transaction} />
                ))}
              </div>
            </ScrollArea>

            {/* Footer with action button */}
            <div className="border-t pt-3 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8"
                onClick={() => {
                  // In real app, this would open transaction creation dialog
                  console.log("Create new transaction");
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Neue Transaktion
              </Button>
            </div>
          </>
        )}
      </div>
    </WidgetContainer>
  );
}

// Helper function for status badges
function getStatusBadge(status: Transaction["status"]) {
  switch (status) {
    case "completed":
      return <Badge variant="default" className="bg-green-100 text-green-800 text-xs">Abgeschlossen</Badge>;
    case "pending":
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">Ausstehend</Badge>;
    case "failed":
      return <Badge variant="destructive" className="text-xs">Fehlgeschlagen</Badge>;
  }
}

function TransactionItem({ transaction }: { transaction: Transaction }) {
  const config = TRANSACTION_CONFIG[transaction.type];
  const Icon = config.icon;

  return (
    <div className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
      {/* Transaction Icon */}
      <div className={cn("p-1.5 rounded-full", config.bgColor)}>
        <Icon className={cn("h-3 w-3", config.color)} />
      </div>

      {/* Transaction Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{transaction.instrument}</p>
            <p className="text-xs text-muted-foreground">
              {config.label}
              {transaction.quantity && (
                <> • {transaction.quantity} Stück</>
              )}
            </p>
          </div>
          <div className="text-right ml-2">
            <p className={cn(
              "text-sm font-medium",
              transaction.type === "buy" ? "text-red-600" :
              transaction.type === "sell" ? "text-green-600" :
              "text-blue-600"
            )}>
              {transaction.type === "buy" ? "-" : "+"}€{transaction.amount.toLocaleString("de-DE", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {transaction.date.toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
              })}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-1">
          {getStatusBadge(transaction.status)}
        </div>
      </div>
    </div>
  );
}

export default RecentTransactionsWidget;