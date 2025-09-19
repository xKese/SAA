export default function Rebalancing() {
  return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Portfolio Rebalancing</h1>
          <p className="text-muted-foreground">Automated rebalancing tools and strategies</p>
        </div>

        <div className="grid gap-6">
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Drift Analysis</h2>
            <p className="text-muted-foreground">Coming soon - Monitor how your portfolio has drifted from target allocations.</p>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Rebalancing Calculator</h2>
            <p className="text-muted-foreground">Coming soon - Calculate optimal trades to return to target allocation.</p>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Tax-Aware Rebalancing</h2>
            <p className="text-muted-foreground">Coming soon - Minimize tax impact when rebalancing portfolios.</p>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Scheduled Rebalancing</h2>
            <p className="text-muted-foreground">Coming soon - Set up automatic rebalancing triggers and schedules.</p>
          </div>
        </div>
      </div>
  );
}