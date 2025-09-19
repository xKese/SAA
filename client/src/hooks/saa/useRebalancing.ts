import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface RebalancingRequest {
  portfolioId: string;
  type: 'threshold' | 'calendar' | 'tactical' | 'cash_flow';
  targetAllocation?: Record<string, number>;
  thresholds?: {
    deviation: number;
    minTradeSize: number;
    maxCosts: number;
  };
  constraints?: {
    taxOptimized?: boolean;
    liquidityPreserving?: boolean;
    maxTradingVolume?: number;
    excludeInstruments?: string[];
  };
}

interface RebalancingPlan {
  id: string;
  portfolioId: string;
  portfolioName: string;
  type: string;
  status: 'draft' | 'approved' | 'executing' | 'completed' | 'failed';
  trades: TradeProposal[];
  expectedCosts: number;
  taxImpact: number;
  riskImpact: number;
  marketImpact: number;
  estimatedDuration: string;
  createdAt: string;
  approvedAt?: string;
  executedAt?: string;
}

interface TradeProposal {
  id: string;
  instrumentName: string;
  isin?: string;
  action: 'buy' | 'sell' | 'hold';
  currentValue: number;
  targetValue: number;
  changeAmount: number;
  changePercentage: number;
  priority: 'high' | 'medium' | 'low';
  estimatedCost: number;
  marketImpact: number;
  liquidityScore: number;
  executionTime?: string;
}

interface RebalancingAlert {
  id: string;
  portfolioId: string;
  portfolioName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'threshold_breach' | 'drift_accumulation' | 'risk_increase' | 'opportunity';
  message: string;
  currentDeviation: number;
  threshold: number;
  affectedAssetClasses: string[];
  estimatedCost: number;
  createdAt: string;
}

interface RebalancingExecution {
  planId: string;
  status: 'preparing' | 'executing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentTrade?: string;
  completedTrades: number;
  totalTrades: number;
  executionLog: Array<{
    timestamp: string;
    action: string;
    status: 'success' | 'error' | 'warning';
    message: string;
  }>;
}

export function useRebalancing() {
  const [isCreating, setIsCreating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const queryClient = useQueryClient();

  // Create rebalancing plan
  const createRebalancingPlanMutation = useMutation({
    mutationFn: async (request: RebalancingRequest): Promise<RebalancingPlan> => {
      const response = await fetch('/api/rebalancing/plans', {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rebalancing-plans'] });
      queryClient.invalidateQueries({ queryKey: ['rebalancing-alerts'] });
    },
  });

  // Execute rebalancing plan
  const executeRebalancingMutation = useMutation({
    mutationFn: async (planId: string): Promise<{ executionId: string }> => {
      const response = await fetch(`/api/rebalancing/plans/${planId}/execute`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (_, planId) => {
      queryClient.invalidateQueries({ queryKey: ['rebalancing-plans'] });
      queryClient.invalidateQueries({ queryKey: ['rebalancing-execution', planId] });
    },
  });

  // Cancel rebalancing execution
  const cancelRebalancingMutation = useMutation({
    mutationFn: async (executionId: string): Promise<void> => {
      const response = await fetch(`/api/rebalancing/executions/${executionId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel rebalancing: ${response.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rebalancing-executions'] });
    },
  });

  // Approve rebalancing plan
  const approveRebalancingMutation = useMutation({
    mutationFn: async (planId: string): Promise<void> => {
      const response = await fetch(`/api/rebalancing/plans/${planId}/approve`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to approve rebalancing plan: ${response.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rebalancing-plans'] });
    },
  });

  // Get rebalancing plans
  const useRebalancingPlans = () => {
    return useQuery<RebalancingPlan[]>({
      queryKey: ['rebalancing-plans'],
      queryFn: async () => {
        const response = await fetch('/api/rebalancing/plans');
        if (!response.ok) {
          throw new Error('Failed to fetch rebalancing plans');
        }
        return response.json();
      },
    });
  };

  // Get rebalancing alerts
  const useRebalancingAlerts = () => {
    return useQuery<RebalancingAlert[]>({
      queryKey: ['rebalancing-alerts'],
      queryFn: async () => {
        const response = await fetch('/api/rebalancing/alerts');
        if (!response.ok) {
          throw new Error('Failed to fetch rebalancing alerts');
        }
        return response.json();
      },
      refetchInterval: 30000, // Poll every 30 seconds
    });
  };

  // Get rebalancing execution status
  const useRebalancingExecution = (planId: string) => {
    return useQuery<RebalancingExecution>({
      queryKey: ['rebalancing-execution', planId],
      queryFn: async () => {
        const response = await fetch(`/api/rebalancing/plans/${planId}/execution`);
        if (!response.ok) {
          throw new Error('Failed to fetch rebalancing execution');
        }
        return response.json();
      },
      enabled: !!planId,
      refetchInterval: (data) => {
        // Poll more frequently if execution is active
        return data?.status === 'executing' ? 2000 : 10000;
      },
    });
  };

  // Get portfolio drift analysis
  const usePortfolioDrift = (portfolioId: string, targetAllocation?: Record<string, number>) => {
    return useQuery({
      queryKey: ['portfolio-drift', portfolioId, targetAllocation],
      queryFn: async () => {
        const params = new URLSearchParams({
          portfolioId,
          ...(targetAllocation && { targetAllocation: JSON.stringify(targetAllocation) })
        });

        const response = await fetch(`/api/portfolios/drift?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch portfolio drift');
        }
        return response.json();
      },
      enabled: !!portfolioId,
    });
  };

  // Main functions
  const createRebalancingPlan = useCallback(async (request: RebalancingRequest) => {
    setIsCreating(true);
    try {
      const plan = await createRebalancingPlanMutation.mutateAsync(request);
      return plan;
    } finally {
      setIsCreating(false);
    }
  }, [createRebalancingPlanMutation]);

  const executeRebalancing = useCallback(async (planId: string) => {
    setIsExecuting(true);
    try {
      const result = await executeRebalancingMutation.mutateAsync(planId);
      return result;
    } finally {
      setIsExecuting(false);
    }
  }, [executeRebalancingMutation]);

  const approveRebalancing = useCallback(async (planId: string) => {
    await approveRebalancingMutation.mutateAsync(planId);
  }, [approveRebalancingMutation]);

  const cancelRebalancing = useCallback(async (executionId: string) => {
    await cancelRebalancingMutation.mutateAsync(executionId);
  }, [cancelRebalancingMutation]);

  // Optimistic updates for better UX
  const createRebalancingPlanOptimistic = useCallback(async (request: RebalancingRequest) => {
    const optimisticPlan: RebalancingPlan = {
      id: `temp-${Date.now()}`,
      portfolioId: request.portfolioId,
      portfolioName: 'Loading...',
      type: request.type,
      status: 'draft',
      trades: [],
      expectedCosts: 0,
      taxImpact: 0,
      riskImpact: 0,
      marketImpact: 0,
      estimatedDuration: 'Calculating...',
      createdAt: new Date().toISOString(),
    };

    // Optimistically update cache
    queryClient.setQueryData(['rebalancing-plans'], (old: RebalancingPlan[] = []) => [
      optimisticPlan,
      ...old
    ]);

    try {
      const realPlan = await createRebalancingPlan(request);

      // Replace optimistic plan with real data
      queryClient.setQueryData(['rebalancing-plans'], (old: RebalancingPlan[] = []) =>
        old.map(plan => plan.id === optimisticPlan.id ? realPlan : plan)
      );

      return realPlan;
    } catch (error) {
      // Remove optimistic plan on error
      queryClient.setQueryData(['rebalancing-plans'], (old: RebalancingPlan[] = []) =>
        old.filter(plan => plan.id !== optimisticPlan.id)
      );
      throw error;
    }
  }, [createRebalancingPlan, queryClient]);

  // Batch operations
  const createBatchRebalancing = useCallback(async (portfolioIds: string[], commonSettings: Partial<RebalancingRequest>) => {
    const requests = portfolioIds.map(portfolioId => ({
      portfolioId,
      ...commonSettings
    } as RebalancingRequest));

    const response = await fetch('/api/rebalancing/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      throw new Error('Failed to create batch rebalancing');
    }

    const result = await response.json();
    queryClient.invalidateQueries({ queryKey: ['rebalancing-plans'] });
    return result;
  }, [queryClient]);

  // Simulation functions
  const simulateRebalancing = useCallback(async (request: RebalancingRequest) => {
    const response = await fetch('/api/rebalancing/simulate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to simulate rebalancing');
    }

    return response.json();
  }, []);

  // Historical analysis
  const getRebalancingHistory = useCallback(async (portfolioId: string, timeRange: string = '1Y') => {
    const response = await fetch(`/api/rebalancing/history?portfolioId=${portfolioId}&timeRange=${timeRange}`);

    if (!response.ok) {
      throw new Error('Failed to fetch rebalancing history');
    }

    return response.json();
  }, []);

  // Performance metrics
  const getRebalancingMetrics = useCallback(async (portfolioId: string) => {
    const response = await fetch(`/api/rebalancing/metrics?portfolioId=${portfolioId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch rebalancing metrics');
    }

    return response.json();
  }, []);

  // Auto-rebalancing configuration
  const configureAutoRebalancing = useCallback(async (portfolioId: string, config: {
    enabled: boolean;
    thresholds: Record<string, number>;
    frequency: string;
    conditions: string[];
  }) => {
    const response = await fetch(`/api/rebalancing/auto-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ portfolioId, ...config }),
    });

    if (!response.ok) {
      throw new Error('Failed to configure auto-rebalancing');
    }

    queryClient.invalidateQueries({ queryKey: ['auto-rebalancing-config', portfolioId] });
    return response.json();
  }, [queryClient]);

  return {
    // Core functions
    createRebalancingPlan,
    createRebalancingPlanOptimistic,
    executeRebalancing,
    approveRebalancing,
    cancelRebalancing,

    // Batch operations
    createBatchRebalancing,

    // Simulation & Analysis
    simulateRebalancing,
    getRebalancingHistory,
    getRebalancingMetrics,

    // Auto-rebalancing
    configureAutoRebalancing,

    // Query hooks
    useRebalancingPlans,
    useRebalancingAlerts,
    useRebalancingExecution,
    usePortfolioDrift,

    // State
    isCreating,
    isExecuting,
    isApproving: approveRebalancingMutation.isPending,
    isCancelling: cancelRebalancingMutation.isPending,

    // Utilities
    queryClient,
  };
}