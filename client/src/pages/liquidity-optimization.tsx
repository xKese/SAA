import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { LiquidityWizard } from '@/components/liquidity/LiquidityWizard';
import { OptimizationResults } from '@/components/liquidity/OptimizationResults';
import { TradeExecution } from '@/components/liquidity/TradeExecution';

export function LiquidityOptimizationPage() {
  const { portfolioId } = useParams();
  const [mode, setMode] = useState<'wizard' | 'results' | 'execution'>('wizard');
  const [optimizationResult, setOptimizationResult] = useState(null);

  const { data: portfolio } = useQuery({
    queryKey: ['portfolio', portfolioId],
    queryFn: async () => {
      const response = await fetch(`/api/portfolios/${portfolioId}`);
      if (!response.ok) throw new Error('Failed to load portfolio');
      return response.json();
    },
    enabled: !!portfolioId
  });

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Portfolio-Optimierung bei Liquiditätszufluss</h1>
        <p className="text-gray-600 mt-2">
          Optimieren Sie Ihr Portfolio intelligent bei zusätzlicher Liquidität
        </p>
      </div>

      {mode === 'wizard' && (
        <LiquidityWizard
          portfolioId={portfolioId}
          currentValue={portfolio?.totalValue || 0}
          onComplete={(result) => {
            setOptimizationResult(result);
            setMode('results');
          }}
        />
      )}

      {mode === 'results' && optimizationResult && (
        <OptimizationResults
          result={optimizationResult}
          onProceedToExecution={() => setMode('execution')}
          onBackToWizard={() => setMode('wizard')}
        />
      )}

      {mode === 'execution' && optimizationResult && (
        <TradeExecution
          optimizationResult={optimizationResult}
          portfolioId={portfolioId}
          onComplete={() => {
            // Navigation zurück zum Portfolio
            window.location.href = `/#/portfolio/${portfolioId}`;
          }}
        />
      )}
    </div>
  );
}