import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface PortfolioCreationRequest {
  name: string;
  description?: string;
  amount: number;
  riskProfile: 'conservative' | 'moderate' | 'aggressive' | 'balanced';
  objectives?: string[];
  timeHorizon: 'short' | 'medium' | 'long';
  constraints?: {
    maxPositionSize?: number;
    excludedInstruments?: string[];
    preferredAssetClasses?: string[];
    liquidityRequirements?: number;
    esgFocus?: boolean;
    taxOptimized?: boolean;
  };
  universe?: any[];
  targetAllocation?: Record<string, number>;
}

interface PortfolioCreationResponse {
  portfolioId: string;
  strategy: any;
  status: 'created' | 'processing' | 'error';
  message?: string;
}

export function usePortfolioCreation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const createPortfolioMutation = useMutation({
    mutationFn: async (request: PortfolioCreationRequest): Promise<PortfolioCreationResponse> => {
      const response = await fetch('/api/saa/portfolios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate portfolios query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['saa', 'portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });

      // Cache the new portfolio data
      queryClient.setQueryData(['portfolio', data.portfolioId], data);

      setError(null);
      console.log('Portfolio created successfully:', data);
    },
    onError: (error: Error) => {
      console.error('Portfolio creation failed:', error);
      setError(error.message);
    },
  });

  const createPortfolio = async (request: PortfolioCreationRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await createPortfolioMutation.mutateAsync(request);
      return result;
    } catch (error) {
      // Error is already handled in onError
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Hook for creating portfolio with optimistic updates
  const createPortfolioOptimistic = async (request: PortfolioCreationRequest) => {
    const optimisticPortfolio = {
      id: `temp-${Date.now()}`,
      name: request.name,
      description: request.description,
      totalValue: request.amount,
      riskProfile: request.riskProfile,
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      positionCount: 0,
      analysisCount: 0
    };

    // Optimistically update the portfolios cache
    queryClient.setQueryData(['saa', 'portfolios'], (old: any[] = []) => [
      optimisticPortfolio,
      ...old
    ]);

    try {
      const result = await createPortfolio(request);

      // Replace optimistic portfolio with real data
      queryClient.setQueryData(['saa', 'portfolios'], (old: any[] = []) =>
        old.map(p => p.id === optimisticPortfolio.id ? {
          ...result.strategy,
          id: result.portfolioId
        } : p)
      );

      return result;
    } catch (error) {
      // Remove optimistic portfolio on error
      queryClient.setQueryData(['saa', 'portfolios'], (old: any[] = []) =>
        old.filter(p => p.id !== optimisticPortfolio.id)
      );
      throw error;
    }
  };

  // Hook for validating portfolio creation data
  const validatePortfolioCreation = (request: Partial<PortfolioCreationRequest>) => {
    const errors: Record<string, string> = {};

    if (!request.name?.trim()) {
      errors.name = 'Portfolio-Name ist erforderlich';
    }

    if (!request.amount || request.amount < 1000) {
      errors.amount = 'Mindestbetrag: €1.000';
    }

    if (!request.riskProfile) {
      errors.riskProfile = 'Risikoprofil ist erforderlich';
    }

    if (!request.timeHorizon) {
      errors.timeHorizon = 'Anlagehorizont ist erforderlich';
    }

    // Validate target allocation if provided
    if (request.targetAllocation) {
      const totalAllocation = Object.values(request.targetAllocation).reduce((sum, val) => sum + val, 0);
      if (Math.abs(totalAllocation - 100) > 0.1) {
        errors.targetAllocation = 'Gesamtallokation muss 100% betragen';
      }
    }

    // Validate constraints
    if (request.constraints?.maxPositionSize &&
        (request.constraints.maxPositionSize < 0 || request.constraints.maxPositionSize > 1)) {
      errors.maxPositionSize = 'Maximale Positionsgröße muss zwischen 0% und 100% liegen';
    }

    if (request.constraints?.liquidityRequirements &&
        (request.constraints.liquidityRequirements < 0 || request.constraints.liquidityRequirements > 1)) {
      errors.liquidityRequirements = 'Liquiditätsanforderungen müssen zwischen 0% und 100% liegen';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };

  // Hook for getting creation progress
  const getCreationProgress = (portfolioId: string) => {
    return queryClient.getQueryData(['portfolio-creation-progress', portfolioId]);
  };

  // Hook for canceling portfolio creation
  const cancelCreation = useMutation({
    mutationFn: async (portfolioId: string) => {
      const response = await fetch(`/api/saa/portfolios/${portfolioId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel portfolio creation: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (_, portfolioId) => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-creation-progress', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['saa', 'portfolios'] });
    },
  });

  return {
    createPortfolio,
    createPortfolioOptimistic,
    validatePortfolioCreation,
    getCreationProgress,
    cancelCreation: cancelCreation.mutate,
    isLoading: isLoading || createPortfolioMutation.isPending,
    error,
    isSuccess: createPortfolioMutation.isSuccess,
    isIdle: createPortfolioMutation.isIdle,
    reset: () => {
      setError(null);
      createPortfolioMutation.reset();
    }
  };
}