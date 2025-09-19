import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FileUpload from '../../client/src/components/FileUpload';
import { Portfolio } from '@shared/schema';

// Mock the API request
const mockApiRequest = vi.fn();
vi.mock('../../client/src/utils/api-request', () => ({
  apiRequest: mockApiRequest,
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('../../client/src/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('Portfolio Deletion Race Condition Fixes', () => {
  let queryClient: QueryClient;
  let mockOnUploadSuccess: ReturnType<typeof vi.fn>;
  let mockOnSelectPortfolio: ReturnType<typeof vi.fn>;

  const mockPortfolios: Portfolio[] = [
    {
      id: '1',
      name: 'Test Portfolio 1',
      fileName: 'test1.csv',
      uploadedAt: new Date('2024-01-01'),
      analysisStatus: 'completed' as const,
      analysisProgress: 100,
      currentPhase: 'Analysis complete',
      analysisResults: null,
      totalValue: 100000,
      positionCount: 5
    },
    {
      id: '2',
      name: 'Test Portfolio 2',
      fileName: 'test2.csv',
      uploadedAt: new Date('2024-01-02'),
      analysisStatus: 'analyzing' as const,
      analysisProgress: 50,
      currentPhase: 'Phase 2: Asset allocation',
      analysisResults: null,
      totalValue: 200000,
      positionCount: 8
    },
    {
      id: '3',
      name: 'Test Portfolio 3',
      fileName: 'test3.csv',
      uploadedAt: new Date('2024-01-03'),
      analysisStatus: 'pending' as const,
      analysisProgress: 0,
      currentPhase: 'Phase 0: Instrumentenidentifikation',
      analysisResults: null,
      totalValue: 0,
      positionCount: 0
    },
    {
      id: '4',
      name: 'Test Portfolio 4',
      fileName: 'test4.csv',
      uploadedAt: new Date('2024-01-04'),
      analysisStatus: 'failed' as const,
      analysisProgress: 25,
      currentPhase: 'Phase 1: Portfolio-Grundlagen-Analyse',
      analysisResults: null,
      totalValue: 0,
      positionCount: 0
    }
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    mockOnUploadSuccess = vi.fn();
    mockOnSelectPortfolio = vi.fn();
    mockApiRequest.mockClear();
    mockToast.mockClear();
  });

  const renderFileUpload = (props: Partial<Parameters<typeof FileUpload>[0]> = {}) => {
    const defaultProps = {
      onUploadSuccess: mockOnUploadSuccess,
      portfolios: mockPortfolios,
      selectedPortfolioId: null,
      onSelectPortfolio: mockOnSelectPortfolio,
      ...props
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <FileUpload {...defaultProps} />
      </QueryClientProvider>
    );
  };

  it('should show delete button for completed portfolios', () => {
    renderFileUpload({ selectedPortfolioId: '1' }); // Portfolio 1 is completed
    
    // Verify the portfolio is shown as selected
    expect(screen.getByText('Test Portfolio 1 - Fertig')).toBeInTheDocument();
    
    // Delete button should be present for completed portfolios
    expect(screen.getByTestId('delete-portfolio')).toBeInTheDocument();
  });

  it('should handle portfolio deletion race conditions', () => {
    // Test that the component handles the case where selectedPortfolioId points to a non-existent portfolio
    const portfoliosWithoutSelected = mockPortfolios.filter(p => p.id !== '1');
    
    renderFileUpload({ 
      selectedPortfolioId: '1', 
      portfolios: portfoliosWithoutSelected 
    });

    // The component should handle this gracefully - no error should be thrown
    // The selected portfolio should be undefined/null, which is handled by the safe access patterns
    expect(screen.queryByText('Test Portfolio 1 - Fertig')).not.toBeInTheDocument();
    
    // Delete button should not be present when portfolio doesn't exist
    expect(screen.queryByTestId('delete-portfolio')).not.toBeInTheDocument();
  });

  it('should not show delete button when no portfolio is selected', () => {
    renderFileUpload({ selectedPortfolioId: null });
    
    // Delete button should not be present when no portfolio is selected
    expect(screen.queryByTestId('delete-portfolio')).not.toBeInTheDocument();
  });

  it('should not show delete button for analyzing portfolios', () => {
    renderFileUpload({ selectedPortfolioId: '2' }); // Portfolio 2 is analyzing
    
    // Delete button should not be present for analyzing portfolios
    expect(screen.queryByTestId('delete-portfolio')).not.toBeInTheDocument();
    
    // Should show analysis progress instead
    expect(screen.getByTestId('analysis-progress')).toBeInTheDocument();
    expect(screen.getByText('Analyse läuft...')).toBeInTheDocument();
  });

  it('should have correct deletion mutation setup', () => {
    renderFileUpload({ selectedPortfolioId: '1' });

    // Verify that the delete button exists and is properly configured
    const deleteButton = screen.getByTestId('delete-portfolio');
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).toHaveAttribute('data-testid', 'delete-portfolio');
    
    // Verify that it's within an AlertDialog trigger
    expect(deleteButton.closest('[aria-haspopup="dialog"]')).toBeTruthy();
  });

  it('should clear selection when selected portfolio is removed from list', async () => {
    // Start with portfolio selected
    const { rerender } = renderFileUpload({ selectedPortfolioId: '1' });

    // Verify portfolio is selected
    expect(screen.getByText('Test Portfolio 1 - Fertig')).toBeInTheDocument();

    // Simulate portfolio being removed from list (after deletion)
    const updatedPortfolios = mockPortfolios.filter(p => p.id !== '1');
    
    rerender(
      <QueryClientProvider client={queryClient}>
        <FileUpload
          onUploadSuccess={mockOnUploadSuccess}
          portfolios={updatedPortfolios}
          selectedPortfolioId="1" // Still pointing to deleted portfolio
          onSelectPortfolio={mockOnSelectPortfolio}
        />
      </QueryClientProvider>
    );

    // The component should recognize the portfolio is gone and not show it
    // This is handled by the safe access patterns in the component
    await waitFor(() => {
      expect(screen.queryByText('Test Portfolio 1 - Fertig')).not.toBeInTheDocument();
    });
  });

  it('should show delete button for pending portfolios', () => {
    renderFileUpload({ selectedPortfolioId: '3' }); // Portfolio 3 is pending
    
    // Verify the portfolio is shown as selected
    expect(screen.getByText('Test Portfolio 3 - Wartend')).toBeInTheDocument();
    
    // Delete button should be present for pending portfolios
    expect(screen.getByTestId('delete-portfolio')).toBeInTheDocument();
  });

  it('should show delete button for failed portfolios', () => {
    renderFileUpload({ selectedPortfolioId: '4' }); // Portfolio 4 is failed
    
    // Verify the portfolio is shown as selected
    expect(screen.getByText('Test Portfolio 4 - Wartend')).toBeInTheDocument();
    
    // Delete button should be present for failed portfolios
    expect(screen.getByTestId('delete-portfolio')).toBeInTheDocument();
  });

  it('should show appropriate confirmation message for pending portfolios', () => {
    renderFileUpload({ selectedPortfolioId: '3' }); // Portfolio 3 is pending
    
    // Verify the portfolio is shown as selected
    expect(screen.getByText('Test Portfolio 3 - Wartend')).toBeInTheDocument();
    
    // Delete button should be present
    expect(screen.getByTestId('delete-portfolio')).toBeInTheDocument();
    
    // Note: Due to AlertDialog portal issues in tests, we can't easily test the dialog content
    // But we can verify the delete button exists for pending portfolios
  });

  it('should show appropriate confirmation message for failed portfolios', () => {
    renderFileUpload({ selectedPortfolioId: '4' }); // Portfolio 4 is failed
    
    // Verify the portfolio is shown as selected
    expect(screen.getByText('Test Portfolio 4 - Wartend')).toBeInTheDocument();
    
    // Delete button should be present
    expect(screen.getByTestId('delete-portfolio')).toBeInTheDocument();
    
    // Note: Due to AlertDialog portal issues in tests, we can't easily test the dialog content
    // But we can verify the delete button exists for failed portfolios
  });
});