export default function PortfolioConstruction() {
  return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Portfolio Construction</h1>
          <p className="text-muted-foreground">Build and optimize your investment portfolios</p>
        </div>

        <div className="grid gap-6">
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Portfolio Builder</h2>
            <p className="text-muted-foreground">Coming soon - Create new portfolios with guided allocation tools.</p>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Asset Selection</h2>
            <p className="text-muted-foreground">Coming soon - Choose instruments from our investment universe.</p>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Allocation Wizard</h2>
            <p className="text-muted-foreground">Coming soon - Set target allocations with intelligent recommendations.</p>
          </div>
        </div>
      </div>
  );
}