import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface OptimizationConstraints {
  minWeight: number;
  maxWeight: number;
  sectorLimits: { [sector: string]: number };
  geographyLimits: { [geography: string]: number };
  excludeInstruments: string[];
  includeInstruments: string[];
  riskBudget: number;
  targetReturn?: number;
  maxRisk?: number;
}

export interface OptimizationResult {
  id: string;
  portfolioId: string;
  method: 'mean-variance' | 'risk-parity' | 'black-litterman' | 'min-variance';
  constraints: OptimizationConstraints;
  results: {
    weights: { [symbol: string]: number };
    expectedReturn: number;
    expectedRisk: number;
    sharpeRatio: number;
    efficientFrontier?: {
      returns: number[];
      risks: number[];
      weights: { [symbol: string]: number }[];
    };
  };
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface RebalancingPlan {
  id: string;
  portfolioId: string;
  targetWeights: { [symbol: string]: number };
  currentWeights: { [symbol: string]: number };
  trades: {
    symbol: string;
    action: 'buy' | 'sell';
    quantity: number;
    value: number;
  }[];
  totalCost: number;
  taxImpact: number;
  createdAt: string;
}

interface OptimizationState {
  optimizations: OptimizationResult[];
  rebalancingPlans: RebalancingPlan[];
  activeOptimization: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: OptimizationState = {
  optimizations: [],
  rebalancingPlans: [],
  activeOptimization: null,
  loading: false,
  error: null,
};

// Async thunks for optimization API calls
export const runOptimization = createAsyncThunk(
  'optimization/runOptimization',
  async (params: {
    portfolioId: string;
    method: OptimizationResult['method'];
    constraints: OptimizationConstraints;
  }) => {
    const response = await fetch('/api/optimization/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error('Failed to run optimization');
    }
    return response.json();
  }
);

export const fetchOptimizations = createAsyncThunk(
  'optimization/fetchOptimizations',
  async (portfolioId: string) => {
    const response = await fetch(`/api/optimization/portfolio/${portfolioId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch optimizations');
    }
    return response.json();
  }
);

export const createRebalancingPlan = createAsyncThunk(
  'optimization/createRebalancingPlan',
  async (params: {
    portfolioId: string;
    targetWeights: { [symbol: string]: number };
  }) => {
    const response = await fetch('/api/rebalancing/plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error('Failed to create rebalancing plan');
    }
    return response.json();
  }
);

export const fetchRebalancingPlans = createAsyncThunk(
  'optimization/fetchRebalancingPlans',
  async (portfolioId: string) => {
    const response = await fetch(`/api/rebalancing/portfolio/${portfolioId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch rebalancing plans');
    }
    return response.json();
  }
);

const optimizationSlice = createSlice({
  name: 'optimization',
  initialState,
  reducers: {
    setActiveOptimization: (state, action: PayloadAction<string | null>) => {
      state.activeOptimization = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateOptimizationStatus: (state, action: PayloadAction<{ id: string; status: OptimizationResult['status']; error?: string }>) => {
      const optimization = state.optimizations.find(o => o.id === action.payload.id);
      if (optimization) {
        optimization.status = action.payload.status;
        if (action.payload.error) {
          optimization.error = action.payload.error;
        }
        if (action.payload.status === 'completed' || action.payload.status === 'failed') {
          optimization.completedAt = new Date().toISOString();
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Run optimization
      .addCase(runOptimization.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(runOptimization.fulfilled, (state, action) => {
        state.loading = false;
        state.optimizations.push(action.payload);
        state.activeOptimization = action.payload.id;
      })
      .addCase(runOptimization.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to run optimization';
      })
      // Fetch optimizations
      .addCase(fetchOptimizations.fulfilled, (state, action) => {
        state.optimizations = action.payload;
      })
      // Create rebalancing plan
      .addCase(createRebalancingPlan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRebalancingPlan.fulfilled, (state, action) => {
        state.loading = false;
        state.rebalancingPlans.push(action.payload);
      })
      .addCase(createRebalancingPlan.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create rebalancing plan';
      })
      // Fetch rebalancing plans
      .addCase(fetchRebalancingPlans.fulfilled, (state, action) => {
        state.rebalancingPlans = action.payload;
      });
  },
});

export const { setActiveOptimization, clearError, updateOptimizationStatus } = optimizationSlice.actions;
export default optimizationSlice.reducer;