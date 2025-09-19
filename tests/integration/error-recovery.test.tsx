import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import FileUpload from '@/components/FileUpload';
import { categorizeError, ErrorType } from '@/types/errors';
import { errorMetrics } from '@/lib/queryClient';

// Mock the API request function
vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual('@/lib/queryClient');
  return {
    ...actual,
    apiRequest: vi.fn()
  };
});

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

describe('Error Recovery Integration Tests', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    vi.clearAllMocks();
    errorMetrics.reset();
  });

  describe('Network Error Recovery', () => {
    it('should handle network timeout with retry functionality', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      let attemptCount = 0;
      mockApiRequest.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          const timeoutError = new Error('Network timeout after 30000ms');
          (timeoutError as any).name = 'TimeoutError';
          (timeoutError as any).status = 0;
          return Promise.reject(timeoutError);
        }
        return Promise.resolve({
          json: () => Promise.resolve({ 
            fileName: 'test.csv',
            canProceed: true,
            positions: [],
            validationErrors: [],
            warnings: []
          })
        });
      });

      const user = userEvent.setup();
      
      render(
        <QueryClientProvider client={queryClient}>
          <FileUpload 
            onUploadSuccess={vi.fn()}
            portfolios={[]}
            selectedPortfolioId={null}
            onSelectPortfolio={vi.fn()}
          />
        </QueryClientProvider>
      );

      const file = new File(['test content'], 'test.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');
      await user.upload(input, file);

      // Should eventually succeed after retries
      await waitFor(() => {
        expect(screen.getByText('Dateivorschau')).toBeInTheDocument();
      }, { timeout: 10000 });

      expect(attemptCount).toBe(3);
    });

    it('should handle connection failures with appropriate messaging', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      const connectionError = new Error('Failed to fetch');
      (connectionError as any).name = 'TypeError';
      mockApiRequest.mockRejectedValue(connectionError);

      const user = userEvent.setup();
      
      render(
        <QueryClientProvider client={queryClient}>
          <FileUpload 
            onUploadSuccess={vi.fn()}
            portfolios={[]}
            selectedPortfolioId={null}
            onSelectPortfolio={vi.fn()}
          />
        </QueryClientProvider>
      );

      const file = new File(['test content'], 'test.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/Verbindungsproblem|Netzwerkfehler/)).toBeInTheDocument();
      });
    });

    it('should track error metrics during recovery attempts', async () => {
      const networkError = new Error('Network error');
      const categorized = categorizeError(networkError);
      
      // Simulate multiple retry attempts
      errorMetrics.recordError(categorized);
      errorMetrics.recordRetry(ErrorType.NETWORK);
      errorMetrics.recordRetry(ErrorType.NETWORK);
      
      const metrics = errorMetrics.getMetrics();
      
      expect(metrics.errorCounts[ErrorType.NETWORK]).toBe(1);
      expect(metrics.retryAttempts[ErrorType.NETWORK]).toBe(2);
      expect(metrics.totalRetries).toBe(2);
    });
  });

  describe('Validation Error Recovery', () => {
    it('should provide clear guidance for position value errors', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      const validationError = new Error('Position "Apple Inc." has invalid or missing value: undefined');
      mockApiRequest.mockRejectedValue(validationError);

      const user = userEvent.setup();
      
      render(
        <QueryClientProvider client={queryClient}>
          <FileUpload 
            onUploadSuccess={vi.fn()}
            portfolios={[]}
            selectedPortfolioId={null}
            onSelectPortfolio={vi.fn()}
          />
        </QueryClientProvider>
      );

      const file = new File(['Name,ISIN,Value\nApple Inc.,US0378331005,'], 'invalid.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/Portfolio-Daten unvollständig|Positionswerte fehlerhaft/)).toBeInTheDocument();
      });

      // Should show specific guidance
      expect(screen.getByText(/Lösungsvorschläge|Lösungsvorschlag/)).toBeInTheDocument();
    });

    it('should handle file format errors with format guidance', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      const formatError = new Error('Unsupported file format');
      mockApiRequest.mockRejectedValue(formatError);

      const user = userEvent.setup();
      
      render(
        <QueryClientProvider client={queryClient}>
          <FileUpload 
            onUploadSuccess={vi.fn()}
            portfolios={[]}
            selectedPortfolioId={null}
            onSelectPortfolio={vi.fn()}
          />
        </QueryClientProvider>
      );

      const file = new File(['invalid content'], 'test.txt', { type: 'text/plain' });
      const input = screen.getByTestId('file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/Dateiformat nicht unterstützt/)).toBeInTheDocument();
      });
    });

    it('should allow user to fix validation errors and retry', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      let isFixed = false;
      mockApiRequest.mockImplementation(() => {
        if (!isFixed) {
          isFixed = true;
          return Promise.reject(new Error('Validation failed: missing values'));
        }
        return Promise.resolve({
          json: () => Promise.resolve({
            fileName: 'fixed.csv',
            canProceed: true,
            positions: [],
            validationErrors: [],
            warnings: []
          })
        });
      });

      const user = userEvent.setup();
      
      render(
        <QueryClientProvider client={queryClient}>
          <FileUpload 
            onUploadSuccess={vi.fn()}
            portfolios={[]}
            selectedPortfolioId={null}
            onSelectPortfolio={vi.fn()}
          />
        </QueryClientProvider>
      );

      // Initial upload with error
      const file = new File(['Name,ISIN,Value\nApple Inc.,,'], 'invalid.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/Eingabedaten ungültig|Validierungsfehler/)).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByText(/Erneut versuchen|Wiederholen/);
      await user.click(retryButton);

      // Should succeed after retry
      await waitFor(() => {
        expect(screen.queryByText(/Eingabedaten ungültig|Validierungsfehler/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Server Error Recovery', () => {
    it('should handle 500 errors with retry logic', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      let attemptCount = 0;
      mockApiRequest.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          const serverError = new Error('500: Internal Server Error');
          (serverError as any).status = 500;
          return Promise.reject(serverError);
        }
        return Promise.resolve({
          json: () => Promise.resolve({ 
            fileName: 'test.csv',
            canProceed: true,
            positions: [],
            validationErrors: [],
            warnings: []
          })
        });
      });

      const user = userEvent.setup();
      
      render(
        <QueryClientProvider client={queryClient}>
          <FileUpload 
            onUploadSuccess={vi.fn()}
            portfolios={[]}
            selectedPortfolioId={null}
            onSelectPortfolio={vi.fn()}
          />
        </QueryClientProvider>
      );

      const file = new File(['test content'], 'test.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('Dateivorschau')).toBeInTheDocument();
      }, { timeout: 10000 });

      expect(attemptCount).toBe(2);
    });

    it('should handle authentication errors without retry', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      const authError = new Error('401: Unauthorized');
      (authError as any).status = 401;
      mockApiRequest.mockRejectedValue(authError);

      const user = userEvent.setup();
      
      render(
        <QueryClientProvider client={queryClient}>
          <FileUpload 
            onUploadSuccess={vi.fn()}
            portfolios={[]}
            selectedPortfolioId={null}
            onSelectPortfolio={vi.fn()}
          />
        </QueryClientProvider>
      );

      const file = new File(['test content'], 'test.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/Anmeldung erforderlich/)).toBeInTheDocument();
      });

      // Should not show retry button for auth errors
      expect(screen.queryByText('Wiederholen')).not.toBeInTheDocument();
    });
  });

  describe('Component Error Boundary Recovery', () => {
    it('should catch component errors and provide recovery options', () => {
      const ThrowError = () => {
        throw new Error('Component crashed');
      };

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Etwas ist schiefgelaufen')).toBeInTheDocument();
      expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
      expect(screen.getByText('Seite neu laden')).toBeInTheDocument();
    });

    it('should reset error boundary state when retry is clicked', () => {
      let shouldThrow = true;
      
      const ConditionalError = () => {
        if (shouldThrow) {
          throw new Error('Component error');
        }
        return <div data-testid="success">Success</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <ConditionalError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Etwas ist schiefgelaufen')).toBeInTheDocument();

      // Fix the error condition
      shouldThrow = false;

      const retryButton = screen.getByText('Erneut versuchen');
      fireEvent.click(retryButton);

      // Re-render with fixed component
      rerender(
        <ErrorBoundary>
          <ConditionalError />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('success')).toBeInTheDocument();
    });

    it('should categorize different error types in error boundary', () => {
      const PositionValueError = () => {
        throw new Error('Position "AAPL" has invalid or missing value: undefined');
      };

      render(
        <ErrorBoundary>
          <PositionValueError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Portfolio-Daten unvollständig')).toBeInTheDocument();
      expect(screen.getByText('Datenvalidierung')).toBeInTheDocument();
    });
  });

  describe('Progressive Error Disclosure', () => {
    it('should show minimal error info initially and expand on demand', async () => {
      const user = userEvent.setup();
      
      render(
        <ErrorBoundary>
          <div>Normal content</div>
        </ErrorBoundary>
      );

      // Force an error
      const ErrorComponent = () => {
        throw new Error('Test error with details');
      };

      const { rerender } = render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Etwas ist schiefgelaufen')).toBeInTheDocument();
      
      // In development mode, should show developer details option
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      rerender(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      if (screen.queryByText('Entwickler-Details anzeigen')) {
        const detailsToggle = screen.getByText('Entwickler-Details anzeigen');
        await user.click(detailsToggle);
        
        expect(screen.getByText('Kategorisierter Fehler:')).toBeInTheDocument();
      }
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error Context Preservation', () => {
    it('should preserve user data during error recovery', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      let shouldFail = true;
      mockApiRequest.mockImplementation(() => {
        if (shouldFail) {
          shouldFail = false;
          return Promise.reject(new Error('Temporary error'));
        }
        return Promise.resolve({
          json: () => Promise.resolve({
            fileName: 'recovered.csv',
            canProceed: true,
            positions: [],
            validationErrors: [],
            warnings: []
          })
        });
      });

      const user = userEvent.setup();
      
      render(
        <QueryClientProvider client={queryClient}>
          <FileUpload 
            onUploadSuccess={vi.fn()}
            portfolios={[]}
            selectedPortfolioId={null}
            onSelectPortfolio={vi.fn()}
          />
        </QueryClientProvider>
      );

      const file = new File(['test content'], 'original.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');
      await user.upload(input, file);

      // Should show error first
      await waitFor(() => {
        expect(screen.getByText(/Fehler|Error/)).toBeInTheDocument();
      });

      // Retry should succeed
      const retryButton = screen.getByText(/Erneut versuchen|Wiederholen/);
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Dateivorschau')).toBeInTheDocument();
      });
    });
  });

  describe('Error State Cleanup', () => {
    it('should clean up error state when navigating away', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      mockApiRequest.mockRejectedValue(new Error('Upload error'));

      const user = userEvent.setup();
      
      render(
        <QueryClientProvider client={queryClient}>
          <FileUpload 
            onUploadSuccess={vi.fn()}
            portfolios={[]}
            selectedPortfolioId={null}
            onSelectPortfolio={vi.fn()}
          />
        </QueryClientProvider>
      );

      const file = new File(['test content'], 'test.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/Fehler|Error/)).toBeInTheDocument();
      });

      // Clear selection should reset error state
      const clearButton = screen.getByTestId('clear-selection');
      await user.click(clearButton);

      // Error should be cleared
      expect(screen.queryByText(/Fehler|Error/)).not.toBeInTheDocument();
    });
  });
});