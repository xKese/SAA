import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  setSelectedPortfolio,
  fetchPortfolios,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  type Portfolio
} from '../store/portfolioSlice';

interface PortfolioContextValue {
  // Current state
  portfolios: Portfolio[];
  selectedPortfolioId: string | null;
  selectedPortfolio: Portfolio | null;
  loading: boolean;
  error: string | null;

  // Actions
  setSelectedPortfolioId: (id: string | null) => void;
  refreshPortfolios: () => Promise<void>;
  createNewPortfolio: (data: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Portfolio>;
  updatePortfolioData: (id: string, data: Partial<Portfolio>) => Promise<Portfolio>;
  removePortfolio: (id: string) => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

interface PortfolioProviderProps {
  children: ReactNode;
}

export function PortfolioProvider({ children }: PortfolioProviderProps) {
  const dispatch = useAppDispatch();
  const {
    portfolios,
    selectedPortfolioId,
    loading,
    error
  } = useAppSelector(state => state.portfolio);

  // Find the currently selected portfolio
  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId) || null;

  // Action handlers
  const setSelectedPortfolioId = useCallback((id: string | null) => {
    dispatch(setSelectedPortfolio(id));
  }, [dispatch]);

  const refreshPortfolios = useCallback(async () => {
    await dispatch(fetchPortfolios()).unwrap();
  }, [dispatch]);

  const createNewPortfolio = useCallback(async (data: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'>) => {
    return await dispatch(createPortfolio(data)).unwrap();
  }, [dispatch]);

  const updatePortfolioData = useCallback(async (id: string, data: Partial<Portfolio>) => {
    return await dispatch(updatePortfolio({ id, data })).unwrap();
  }, [dispatch]);

  const removePortfolio = useCallback(async (id: string) => {
    await dispatch(deletePortfolio(id)).unwrap();
  }, [dispatch]);

  const contextValue: PortfolioContextValue = {
    // State
    portfolios,
    selectedPortfolioId,
    selectedPortfolio,
    loading,
    error,

    // Actions
    setSelectedPortfolioId,
    refreshPortfolios,
    createNewPortfolio,
    updatePortfolioData,
    removePortfolio,
  };

  return (
    <PortfolioContext.Provider value={contextValue}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}

// Additional hooks for common operations
export function useSelectedPortfolio() {
  const { selectedPortfolio, selectedPortfolioId } = usePortfolio();
  return { selectedPortfolio, selectedPortfolioId };
}

export function usePortfolioActions() {
  const {
    setSelectedPortfolioId,
    refreshPortfolios,
    createNewPortfolio,
    updatePortfolioData,
    removePortfolio,
  } = usePortfolio();

  return {
    setSelectedPortfolioId,
    refreshPortfolios,
    createNewPortfolio,
    updatePortfolioData,
    removePortfolio,
  };
}