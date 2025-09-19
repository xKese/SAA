import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface OptimizationRequest {
  portfolioId: string;
  type: 'strategic' | 'tactical' | 'risk' | 'liquidity';
  config: {
    objective: string;
    constraints: Record<string, any>;
    preferences: Record<string, any>;
    advanced?: Record<string, any>;
  };
}

interface OptimizationJob {
  id: string;
  portfolioId: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startedAt: string;
  completedAt?: string;
  estimatedCompletion?: string;
  results?: any;
  error?: string;
}

interface OptimizationResult {
  jobId: string;
  portfolioId: string;
  optimizationType: string;
  results: {
    targetAllocation: Record<string, number>;
    expectedReturn: number;
    riskReduction: number;
    sharpeImprovement: number;
    tradeProposals: any[];
    costs: {
      total: number;
      breakdown: Record<string, number>;
    };
    timeline: {
      phases: Array<{
        name: string;
        duration: number;
        description: string;
      }>;
    };
  };
  createdAt: string;
}

export function useOptimization() {
  const [pollingInterval, setPollingInterval] = useState<number | false>(false);
  const queryClient = useQueryClient();
  const pollingTimeoutRef = useRef<NodeJS.Timeout>();

  // Start optimization mutation
  const startOptimizationMutation = useMutation({
    mutationFn: async (request: OptimizationRequest): Promise<{ jobId: string }> => {
      const response = await fetch('/api/optimization/start', {
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
    onSuccess: (data, variables) => {
      // Invalidate optimization jobs to refresh the list
      queryClient.invalidateQueries({ queryKey: ['optimization-jobs'] });

      // Start polling for this specific job
      startPolling(data.jobId);

      console.log('Optimization started:', data);
    },
    onError: (error) => {
      console.error('Failed to start optimization:', error);
    },
  });

  // Cancel optimization mutation
  const cancelOptimizationMutation = useMutation({
    mutationFn: async (jobId: string): Promise<void> => {
      const response = await fetch(`/api/optimization/jobs/${jobId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel optimization: ${response.status}`);
      }
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['optimization-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['optimization-job', jobId] });
      stopPolling();
    },
  });

  // Get optimization job status
  const useOptimizationJob = (jobId: string) => {
    return useQuery<OptimizationJob>({
      queryKey: ['optimization-job', jobId],
      queryFn: async () => {
        const response = await fetch(`/api/optimization/jobs/${jobId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch optimization job');
        }
        return response.json();
      },
      enabled: !!jobId,
      refetchInterval: pollingInterval,
    });
  };

  // Get all optimization jobs
  const useOptimizationJobs = () => {
    return useQuery<OptimizationJob[]>({
      queryKey: ['optimization-jobs'],
      queryFn: async () => {
        const response = await fetch('/api/optimization/jobs');
        if (!response.ok) {
          throw new Error('Failed to fetch optimization jobs');
        }
        return response.json();
      },
      refetchInterval: 5000, // Poll every 5 seconds for job list
    });
  };

  // Get optimization results
  const useOptimizationResults = (portfolioId: string) => {
    return useQuery<OptimizationResult[]>({
      queryKey: ['optimization-results', portfolioId],
      queryFn: async () => {
        const response = await fetch(`/api/optimization/results?portfolioId=${portfolioId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch optimization results');
        }
        return response.json();
      },
      enabled: !!portfolioId,
    });
  };

  // Start polling for active jobs
  const startPolling = (jobId?: string) => {
    setPollingInterval(2000); // Poll every 2 seconds

    // Stop polling after 30 minutes (safety net)
    pollingTimeoutRef.current = setTimeout(() => {
      stopPolling();
    }, 30 * 60 * 1000);
  };

  // Stop polling
  const stopPolling = () => {
    setPollingInterval(false);
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
    }
  };

  // Auto-manage polling based on active jobs
  const { data: jobs = [] } = useOptimizationJobs();
  const hasActiveJobs = jobs.some(job => job.status === 'running' || job.status === 'pending');

  useEffect(() => {
    if (hasActiveJobs && !pollingInterval) {
      startPolling();
    } else if (!hasActiveJobs && pollingInterval) {
      stopPolling();
    }

    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, [hasActiveJobs, pollingInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // Start optimization with progress tracking
  const startOptimization = async (request: OptimizationRequest) => {
    try {
      const result = await startOptimizationMutation.mutateAsync(request);
      return result;
    } catch (error) {
      throw error;
    }
  };

  // Cancel optimization
  const cancelOptimization = async (jobId: string) => {
    try {
      await cancelOptimizationMutation.mutateAsync(jobId);
    } catch (error) {
      throw error;
    }
  };

  // Get optimization progress
  const getOptimizationProgress = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return null;

    return {
      progress: job.progress,
      status: job.status,
      estimatedCompletion: job.estimatedCompletion,
      currentPhase: getCurrentPhase(job.progress),
      timeRemaining: getTimeRemaining(job.startedAt, job.estimatedCompletion)
    };
  };

  // Helper function to get current phase based on progress
  const getCurrentPhase = (progress: number) => {
    if (progress < 10) return 'Initialisierung';
    if (progress < 25) return 'Datenaufbereitung';
    if (progress < 50) return 'Risikomodellierung';
    if (progress < 75) return 'Optimierung';
    if (progress < 95) return 'Validierung';
    return 'Finalisierung';
  };

  // Helper function to estimate remaining time
  const getTimeRemaining = (startedAt: string, estimatedCompletion?: string) => {
    if (!estimatedCompletion) return null;

    const now = new Date();
    const completion = new Date(estimatedCompletion);
    const remaining = completion.getTime() - now.getTime();

    if (remaining <= 0) return 'Bald fertig';

    const minutes = Math.ceil(remaining / (1000 * 60));
    if (minutes < 60) return `${minutes} Minuten`;

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Batch optimization for multiple portfolios
  const startBatchOptimization = async (requests: OptimizationRequest[]) => {
    const response = await fetch('/api/optimization/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      throw new Error('Failed to start batch optimization');
    }

    const result = await response.json();
    queryClient.invalidateQueries({ queryKey: ['optimization-jobs'] });
    startPolling();

    return result;
  };

  // Optimization templates
  const getOptimizationTemplates = () => {
    return [
      {
        id: 'conservative_rebalance',
        name: 'Konservatives Rebalancing',
        description: 'Minimale Änderungen, niedrige Kosten',
        config: {
          objective: 'risk',
          constraints: {
            maxPositionSize: 15,
            maxTurnover: 20,
            minLiquidity: 10
          },
          preferences: {
            lowCostPreference: true,
            taxOptimization: true
          }
        }
      },
      {
        id: 'aggressive_growth',
        name: 'Wachstumsorientiert',
        description: 'Maximale Rendite, höhere Volatilität',
        config: {
          objective: 'return',
          constraints: {
            maxPositionSize: 25,
            maxTurnover: 80,
            minLiquidity: 2
          },
          preferences: {
            allowShorts: true,
            allowLeverage: false
          }
        }
      },
      {
        id: 'balanced_sharpe',
        name: 'Ausgewogene Effizienz',
        description: 'Optimales Rendite-Risiko-Verhältnis',
        config: {
          objective: 'sharpe',
          constraints: {
            maxPositionSize: 20,
            maxTurnover: 50,
            minLiquidity: 5
          },
          preferences: {
            esgWeight: 20,
            lowCostPreference: true
          }
        }
      }
    ];
  };

  return {
    // Core functions
    startOptimization,
    cancelOptimization,
    startBatchOptimization,

    // Hooks
    useOptimizationJob,
    useOptimizationJobs,
    useOptimizationResults,

    // Utilities
    getOptimizationProgress,
    getOptimizationTemplates,

    // State
    isStarting: startOptimizationMutation.isPending,
    isCancelling: cancelOptimizationMutation.isPending,
    isPolling: !!pollingInterval,
    hasActiveJobs,

    // Control
    startPolling,
    stopPolling,
  };
}