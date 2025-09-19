import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { categorizeError, ErrorInfo, ErrorType, getErrorMetadata } from '@/types/errors';
import { errorMetrics } from '@/lib/queryClient';

interface ErrorHandlerOptions {
  showToastForTypes?: ErrorType[];
  suppressToastForTypes?: ErrorType[];
  onError?: (error: ErrorInfo) => void;
  onRetry?: () => void;
  retryLimit?: number;
}

interface ErrorHandlerReturn {
  currentError: ErrorInfo | null;
  isRetrying: boolean;
  retryCount: number;
  handleError: (error: Error | string) => void;
  dismissError: () => void;
  retryAction: () => void;
  canRetry: boolean;
}

/**
 * Custom hook for consistent error handling across the application
 */
export function useErrorHandler(options: ErrorHandlerOptions = {}): ErrorHandlerReturn {
  const {
    showToastForTypes = [ErrorType.NETWORK, ErrorType.SERVER, ErrorType.UNKNOWN],
    suppressToastForTypes = [ErrorType.POSITION_VALUE, ErrorType.VALIDATION, ErrorType.CANCELLED],
    onError,
    onRetry,
    retryLimit = 3
  } = options;
  
  const [currentError, setCurrentError] = useState<ErrorInfo | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();
  
  const handleError = useCallback((error: Error | string) => {
    const categorizedError = categorizeError(error);
    const metadata = getErrorMetadata(categorizedError.type);
    
    // Don't set cancelled errors as current error (they're expected behavior)
    if (categorizedError.type !== ErrorType.CANCELLED) {
      setCurrentError(categorizedError);
      setIsRetrying(false);
    }
    
    // Record error in metrics (but skip cancelled errors)
    if (categorizedError.type !== ErrorType.CANCELLED) {
      errorMetrics.recordError(categorizedError);
    }
    
    // Call custom error handler if provided
    onError?.(categorizedError);
    
    // Show toast based on configuration
    const shouldShowToast = showToastForTypes.includes(categorizedError.type) && 
                           !suppressToastForTypes.includes(categorizedError.type);
    
    if (shouldShowToast) {
      toast({
        title: getErrorTitle(categorizedError.type),
        description: categorizedError.message,
        variant: "destructive",
      });
    }
    
    // Enhanced logging with error context (suppress for cancelled errors)
    if (categorizedError.type !== ErrorType.CANCELLED) {
      console.error('Error handled by useErrorHandler:', {
        originalError: error,
        categorizedError,
        metadata,
        errorMetrics: errorMetrics.getMetrics()
      });
    }
  }, [onError, showToastForTypes, suppressToastForTypes, toast]);
  
  const dismissError = useCallback(() => {
    setCurrentError(null);
    setRetryCount(0);
  }, []);
  
  const retryAction = useCallback(async () => {
    if (!currentError || retryCount >= retryLimit || !onRetry) {
      return;
    }
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      await onRetry();
      // If retry succeeds, clear error
      setCurrentError(null);
      setRetryCount(0);
    } catch (error) {
      // If retry fails, handle the new error
      handleError(error as Error);
    } finally {
      setIsRetrying(false);
    }
  }, [currentError, retryCount, retryLimit, onRetry, handleError]);
  
  const canRetry = currentError ? 
    getErrorMetadata(currentError.type).canRetry && retryCount < retryLimit && !!onRetry :
    false;
  
  return {
    currentError,
    isRetrying,
    retryCount,
    handleError,
    dismissError,
    retryAction,
    canRetry
  };
}

/**
 * Get user-friendly error title based on error type
 */
function getErrorTitle(type: ErrorType): string {
  switch (type) {
    case ErrorType.POSITION_VALUE:
      return 'Positionswerte fehlerhaft';
    case ErrorType.VALIDATION:
      return 'Eingabedaten ungültig';
    case ErrorType.FILE_FORMAT:
      return 'Dateiformat nicht unterstützt';
    case ErrorType.NETWORK:
      return 'Verbindungsproblem';
    case ErrorType.SERVER:
      return 'Server-Fehler';
    case ErrorType.ANALYSIS:
      return 'Analyse-Fehler';
    case ErrorType.UPLOAD:
      return 'Upload-Fehler';
    case ErrorType.AUTHENTICATION:
      return 'Anmeldung erforderlich';
    default:
      return 'Fehler aufgetreten';
  }
}

/**
 * Hook specifically for API mutations with error handling
 */
export function useApiErrorHandler() {
  return useErrorHandler({
    showToastForTypes: [ErrorType.NETWORK, ErrorType.SERVER, ErrorType.UPLOAD],
    suppressToastForTypes: [ErrorType.POSITION_VALUE, ErrorType.VALIDATION]
  });
}

/**
 * Hook for form validation errors
 */
export function useValidationErrorHandler(onRetry?: () => void) {
  return useErrorHandler({
    showToastForTypes: [],
    suppressToastForTypes: [ErrorType.POSITION_VALUE, ErrorType.VALIDATION],
    onRetry
  });
}

/**
 * Hook specifically for upload mutations with enhanced error handling
 */
export function useUploadErrorHandler(onRetry?: () => void) {
  return useErrorHandler({
    showToastForTypes: [ErrorType.NETWORK, ErrorType.SERVER, ErrorType.UPLOAD],
    suppressToastForTypes: [ErrorType.POSITION_VALUE, ErrorType.VALIDATION, ErrorType.FILE_FORMAT],
    onRetry,
    retryLimit: 2 // Allow more retries for uploads
  });
}

/**
 * Hook for long-running operations like analysis
 */
export function useAnalysisErrorHandler(onRetry?: () => void) {
  return useErrorHandler({
    showToastForTypes: [ErrorType.NETWORK, ErrorType.SERVER, ErrorType.ANALYSIS],
    suppressToastForTypes: [ErrorType.POSITION_VALUE, ErrorType.VALIDATION],
    onRetry,
    retryLimit: 5 // Allow more retries for analysis operations
  });
}

/**
 * Hook that provides error metrics and monitoring capabilities
 */
export function useErrorMetrics() {
  const getMetrics = useCallback(() => {
    return errorMetrics.getMetrics();
  }, []);
  
  const resetMetrics = useCallback(() => {
    errorMetrics.reset();
  }, []);
  
  const getErrorsByType = useCallback((errorType: ErrorType) => {
    return errorMetrics.errorCounts.get(errorType) || 0;
  }, []);
  
  const getRetriesByType = useCallback((errorType: ErrorType) => {
    return errorMetrics.retryAttempts.get(errorType) || 0;
  }, []);
  
  return {
    getMetrics,
    resetMetrics,
    getErrorsByType,
    getRetriesByType
  };
}