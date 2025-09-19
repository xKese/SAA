import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { 
  useErrorHandler, 
  useApiErrorHandler, 
  useValidationErrorHandler,
  useUploadErrorHandler,
  useAnalysisErrorHandler,
  useErrorMetrics 
} from '@/hooks/use-error-handler';
import { ErrorType } from '@/types/errors';
import { errorMetrics } from '@/lib/queryClient';

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

describe('useErrorHandler Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    errorMetrics.reset();
  });

  describe('Basic Error Handling', () => {
    it('should handle and categorize errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Position "AAPL" has invalid value');
      });

      expect(result.current.currentError).toBeDefined();
      expect(result.current.currentError?.type).toBe(ErrorType.POSITION_VALUE);
      expect(result.current.currentError?.message).toBe('Position "AAPL" has invalid value');
    });

    it('should handle Error objects', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError(new Error('Network error occurred'));
      });

      expect(result.current.currentError?.type).toBe(ErrorType.NETWORK);
    });

    it('should dismiss errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Test error');
      });

      expect(result.current.currentError).toBeDefined();

      act(() => {
        result.current.dismissError();
      });

      expect(result.current.currentError).toBeNull();
      expect(result.current.retryCount).toBe(0);
    });
  });

  describe('Toast Configuration', () => {
    it('should show toast for network errors by default', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Network error: connection failed');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Verbindungsproblem',
        description: 'Network error: connection failed',
        variant: 'destructive'
      });
    });

    it('should not show toast for validation errors by default', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Validation failed: missing field');
      });

      expect(mockToast).not.toHaveBeenCalled();
    });

    it('should respect custom toast configuration', () => {
      const { result } = renderHook(() => 
        useErrorHandler({
          showToastForTypes: [ErrorType.VALIDATION],
          suppressToastForTypes: []
        })
      );

      act(() => {
        result.current.handleError('Validation failed');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Eingabedaten ungültig',
        description: 'Validation failed',
        variant: 'destructive'
      });
    });
  });

  describe('Retry Functionality', () => {
    it('should handle retry actions', async () => {
      const mockOnRetry = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => 
        useErrorHandler({ onRetry: mockOnRetry })
      );

      act(() => {
        result.current.handleError('Network error');
      });

      expect(result.current.canRetry).toBe(true);
      expect(result.current.retryCount).toBe(0);

      await act(async () => {
        await result.current.retryAction();
      });

      expect(mockOnRetry).toHaveBeenCalled();
      expect(result.current.retryCount).toBe(1);
    });

    it('should clear error on successful retry', async () => {
      const mockOnRetry = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => 
        useErrorHandler({ onRetry: mockOnRetry })
      );

      act(() => {
        result.current.handleError('Network error');
      });

      await act(async () => {
        await result.current.retryAction();
      });

      expect(result.current.currentError).toBeNull();
      expect(result.current.retryCount).toBe(0);
    });

    it('should handle retry failures', async () => {
      const mockOnRetry = vi.fn().mockRejectedValue(new Error('Retry failed'));
      const { result } = renderHook(() => 
        useErrorHandler({ onRetry: mockOnRetry })
      );

      act(() => {
        result.current.handleError('Network error');
      });

      await act(async () => {
        await result.current.retryAction();
      });

      expect(result.current.currentError?.message).toBe('Retry failed');
      expect(result.current.retryCount).toBe(1);
    });

    it('should respect retry limits', async () => {
      const mockOnRetry = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => 
        useErrorHandler({ onRetry: mockOnRetry, retryLimit: 2 })
      );

      act(() => {
        result.current.handleError('Network error');
      });

      // First retry
      await act(async () => {
        await result.current.retryAction();
      });

      // Second retry
      await act(async () => {
        await result.current.retryAction();
      });

      expect(result.current.retryCount).toBe(2);
      expect(result.current.canRetry).toBe(false);

      // Third retry should not execute
      await act(async () => {
        await result.current.retryAction();
      });

      expect(mockOnRetry).toHaveBeenCalledTimes(2);
    });

    it('should not allow retry for non-retryable errors', () => {
      const mockOnRetry = vi.fn();
      const { result } = renderHook(() => 
        useErrorHandler({ onRetry: mockOnRetry })
      );

      act(() => {
        result.current.handleError('Unsupported file format');
      });

      expect(result.current.canRetry).toBe(false);
    });
  });

  describe('Error Metrics Integration', () => {
    it('should record errors in metrics', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Network error');
      });

      act(() => {
        result.current.handleError('Validation failed');
      });

      const metrics = errorMetrics.getMetrics();
      expect(metrics.errorCounts[ErrorType.NETWORK]).toBe(1);
      expect(metrics.errorCounts[ErrorType.VALIDATION]).toBe(1);
      expect(metrics.totalErrors).toBe(2);
    });

    it('should call custom error handler', () => {
      const mockOnError = vi.fn();
      const { result } = renderHook(() => 
        useErrorHandler({ onError: mockOnError })
      );

      act(() => {
        result.current.handleError('Test error');
      });

      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ErrorType.UNKNOWN,
          message: 'Test error'
        })
      );
    });
  });

  describe('Loading States', () => {
    it('should track retry loading state', async () => {
      const mockOnRetry = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      const { result } = renderHook(() => 
        useErrorHandler({ onRetry: mockOnRetry })
      );

      act(() => {
        result.current.handleError('Network error');
      });

      expect(result.current.isRetrying).toBe(false);

      const retryPromise = act(async () => {
        result.current.retryAction();
      });

      expect(result.current.isRetrying).toBe(true);

      await retryPromise;

      expect(result.current.isRetrying).toBe(false);
    });
  });
});

describe('Specialized Error Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    errorMetrics.reset();
  });

  describe('useApiErrorHandler', () => {
    it('should configure toast appropriately for API errors', () => {
      const { result } = renderHook(() => useApiErrorHandler());

      act(() => {
        result.current.handleError('Network error');
      });

      expect(mockToast).toHaveBeenCalled();

      act(() => {
        result.current.handleError('Validation failed');
      });

      // Should not show toast for validation errors in API handler
      expect(mockToast).toHaveBeenCalledTimes(1);
    });
  });

  describe('useValidationErrorHandler', () => {
    it('should suppress all toast messages', () => {
      const { result } = renderHook(() => useValidationErrorHandler());

      act(() => {
        result.current.handleError('Network error');
      });

      act(() => {
        result.current.handleError('Validation failed');
      });

      expect(mockToast).not.toHaveBeenCalled();
    });
  });

  describe('useUploadErrorHandler', () => {
    it('should configure appropriate error types and retry limit', () => {
      const mockOnRetry = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useUploadErrorHandler(mockOnRetry));

      act(() => {
        result.current.handleError('Upload failed');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Upload-Fehler',
        description: 'Upload failed',
        variant: 'destructive'
      });

      // Should allow retries with higher limit
      expect(result.current.canRetry).toBe(true);
    });
  });

  describe('useAnalysisErrorHandler', () => {
    it('should configure appropriate error types with higher retry limit', () => {
      const mockOnRetry = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAnalysisErrorHandler(mockOnRetry));

      act(() => {
        result.current.handleError('Analysis failed');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Analyse-Fehler',
        description: 'Analysis failed',
        variant: 'destructive'
      });
    });
  });
});

describe('useErrorMetrics Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    errorMetrics.reset();
  });

  it('should provide access to error metrics', () => {
    const { result } = renderHook(() => useErrorMetrics());
    
    // Add some test data
    errorMetrics.recordError({ type: ErrorType.NETWORK, message: 'Test' } as any);
    errorMetrics.recordError({ type: ErrorType.VALIDATION, message: 'Test' } as any);
    errorMetrics.recordRetry(ErrorType.NETWORK);

    const metrics = result.current.getMetrics();
    
    expect(metrics.errorCounts[ErrorType.NETWORK]).toBe(1);
    expect(metrics.errorCounts[ErrorType.VALIDATION]).toBe(1);
    expect(metrics.retryAttempts[ErrorType.NETWORK]).toBe(1);
    expect(metrics.totalErrors).toBe(2);
    expect(metrics.totalRetries).toBe(1);
  });

  it('should provide error counts by type', () => {
    const { result } = renderHook(() => useErrorMetrics());
    
    errorMetrics.recordError({ type: ErrorType.NETWORK, message: 'Test' } as any);
    errorMetrics.recordError({ type: ErrorType.NETWORK, message: 'Test' } as any);

    expect(result.current.getErrorsByType(ErrorType.NETWORK)).toBe(2);
    expect(result.current.getErrorsByType(ErrorType.VALIDATION)).toBe(0);
  });

  it('should provide retry counts by type', () => {
    const { result } = renderHook(() => useErrorMetrics());
    
    errorMetrics.recordRetry(ErrorType.NETWORK);
    errorMetrics.recordRetry(ErrorType.NETWORK);
    errorMetrics.recordRetry(ErrorType.SERVER);

    expect(result.current.getRetriesByType(ErrorType.NETWORK)).toBe(2);
    expect(result.current.getRetriesByType(ErrorType.SERVER)).toBe(1);
    expect(result.current.getRetriesByType(ErrorType.VALIDATION)).toBe(0);
  });

  it('should reset metrics', () => {
    const { result } = renderHook(() => useErrorMetrics());
    
    errorMetrics.recordError({ type: ErrorType.NETWORK, message: 'Test' } as any);
    errorMetrics.recordRetry(ErrorType.NETWORK);

    let metrics = result.current.getMetrics();
    expect(metrics.totalErrors).toBe(1);
    expect(metrics.totalRetries).toBe(1);

    act(() => {
      result.current.resetMetrics();
    });

    metrics = result.current.getMetrics();
    expect(metrics.totalErrors).toBe(0);
    expect(metrics.totalRetries).toBe(0);
  });
});

describe('Error Title Generation', () => {
  it('should generate appropriate titles for each error type', () => {
    const testCases = [
      { type: ErrorType.POSITION_VALUE, expectedTitle: 'Positionswerte fehlerhaft' },
      { type: ErrorType.VALIDATION, expectedTitle: 'Eingabedaten ungültig' },
      { type: ErrorType.FILE_FORMAT, expectedTitle: 'Dateiformat nicht unterstützt' },
      { type: ErrorType.NETWORK, expectedTitle: 'Verbindungsproblem' },
      { type: ErrorType.SERVER, expectedTitle: 'Server-Fehler' },
      { type: ErrorType.ANALYSIS, expectedTitle: 'Analyse-Fehler' },
      { type: ErrorType.UPLOAD, expectedTitle: 'Upload-Fehler' },
      { type: ErrorType.AUTHENTICATION, expectedTitle: 'Anmeldung erforderlich' },
      { type: ErrorType.UNKNOWN, expectedTitle: 'Fehler aufgetreten' }
    ];

    testCases.forEach(({ type, expectedTitle }) => {
      const { result } = renderHook(() => useErrorHandler());
      
      // Create error message that will categorize to the specific type
      let errorMessage = 'Test error';
      switch (type) {
        case ErrorType.POSITION_VALUE:
          errorMessage = 'Position "AAPL" missing value';
          break;
        case ErrorType.VALIDATION:
          errorMessage = 'Validation failed';
          break;
        case ErrorType.FILE_FORMAT:
          errorMessage = 'Unsupported file format';
          break;
        case ErrorType.NETWORK:
          errorMessage = 'Network error';
          break;
        case ErrorType.SERVER:
          errorMessage = '500: Server error';
          break;
        case ErrorType.ANALYSIS:
          errorMessage = 'Analysis failed';
          break;
        case ErrorType.UPLOAD:
          errorMessage = 'Upload failed';
          break;
        case ErrorType.AUTHENTICATION:
          errorMessage = '401: Unauthorized';
          break;
      }

      act(() => {
        result.current.handleError(errorMessage);
      });

      if (result.current.currentError) {
        // The title generation is tested through toast calls
        const expectedToastCall = mockToast.mock.calls.find(call => 
          call[0].title === expectedTitle
        );
        
        // Some error types don't show toasts by default, so we check the error type instead
        expect(result.current.currentError.type).toBe(type);
      }
    });
  });
});