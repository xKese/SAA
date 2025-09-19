import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Portfolio {
  id: string;
  name: string;
  totalValue: number;
  currency: string;
  positions: Position[];
  analysis?: PortfolioAnalysis;
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  value: number;
  weight: number;
  assetClass: string;
  sector?: string;
  geography?: string;
}

export interface PortfolioAnalysis {
  riskMetrics: {
    volatility: number;
    sharpeRatio: number;
    beta: number;
    maxDrawdown: number;
  };
  assetAllocation: {
    [key: string]: number;
  };
  geographicAllocation: {
    [key: string]: number;
  };
  performance: {
    returns: {
      daily: number;
      weekly: number;
      monthly: number;
      yearly: number;
    };
  };
}

interface PortfolioState {
  portfolios: Portfolio[];
  selectedPortfolioId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: PortfolioState = {
  portfolios: [],
  selectedPortfolioId: null,
  loading: false,
  error: null,
};

// Async thunks for API calls
export const fetchPortfolios = createAsyncThunk(
  'portfolio/fetchPortfolios',
  async () => {
    const response = await fetch('/api/portfolios');
    if (!response.ok) {
      throw new Error('Failed to fetch portfolios');
    }
    return response.json();
  }
);

export const createPortfolio = createAsyncThunk(
  'portfolio/createPortfolio',
  async (portfolioData: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'>) => {
    const response = await fetch('/api/portfolios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(portfolioData),
    });
    if (!response.ok) {
      throw new Error('Failed to create portfolio');
    }
    return response.json();
  }
);

export const updatePortfolio = createAsyncThunk(
  'portfolio/updatePortfolio',
  async ({ id, data }: { id: string; data: Partial<Portfolio> }) => {
    const response = await fetch(`/api/portfolios/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update portfolio');
    }
    return response.json();
  }
);

export const deletePortfolio = createAsyncThunk(
  'portfolio/deletePortfolio',
  async (id: string) => {
    const response = await fetch(`/api/portfolios/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete portfolio');
    }
    return id;
  }
);

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    setSelectedPortfolio: (state, action: PayloadAction<string | null>) => {
      state.selectedPortfolioId = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updatePosition: (state, action: PayloadAction<{ portfolioId: string; position: Position }>) => {
      const portfolio = state.portfolios.find(p => p.id === action.payload.portfolioId);
      if (portfolio) {
        const positionIndex = portfolio.positions.findIndex(p => p.id === action.payload.position.id);
        if (positionIndex !== -1) {
          portfolio.positions[positionIndex] = action.payload.position;
        } else {
          portfolio.positions.push(action.payload.position);
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch portfolios
      .addCase(fetchPortfolios.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPortfolios.fulfilled, (state, action) => {
        state.loading = false;
        state.portfolios = action.payload;
      })
      .addCase(fetchPortfolios.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch portfolios';
      })
      // Create portfolio
      .addCase(createPortfolio.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPortfolio.fulfilled, (state, action) => {
        state.loading = false;
        state.portfolios.push(action.payload);
      })
      .addCase(createPortfolio.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create portfolio';
      })
      // Update portfolio
      .addCase(updatePortfolio.fulfilled, (state, action) => {
        const index = state.portfolios.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.portfolios[index] = action.payload;
        }
      })
      // Delete portfolio
      .addCase(deletePortfolio.fulfilled, (state, action) => {
        state.portfolios = state.portfolios.filter(p => p.id !== action.payload);
        if (state.selectedPortfolioId === action.payload) {
          state.selectedPortfolioId = null;
        }
      });
  },
});

export const { setSelectedPortfolio, clearError, updatePosition } = portfolioSlice.actions;
export default portfolioSlice.reducer;