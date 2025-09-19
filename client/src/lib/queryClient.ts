import { QueryClient, QueryFunction, MutationOptions, QueryOptions, DefaultError } from "@tanstack/react-query";
import { categorizeError, ErrorType, getErrorMetadata, ErrorInfo } from '@/types/errors';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    const error = new Error(`${res.status}: ${text}`);
    // Attach response info for better error categorization
    (error as any).status = res.status;
    (error as any).statusText = res.statusText;
    throw error;
  }
}

/**
 * Enhanced API request function with better error context
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: {
    timeout?: number;
    signal?: AbortSignal;
  }
): Promise<Response> {
  let headers: HeadersInit = {};
  let body: BodyInit | undefined = undefined;
  
  if (data) {
    if (data instanceof FormData) {
      // Let the browser set the Content-Type with boundary for FormData
      body = data;
    } else {
      headers = { "Content-Type": "application/json" };
      body = JSON.stringify(data);
    }
  }
  
  // Create timeout controller if timeout is specified
  const timeoutController = new AbortController();
  let timeoutId: NodeJS.Timeout | undefined;
  
  if (options?.timeout) {
    timeoutId = setTimeout(() => {
      timeoutController.abort();
    }, options.timeout);
  }
  
  // Combine signals if both provided with proper cleanup
  let signal = options?.signal;
  let signalCleanup: (() => void) | undefined;
  
  if (options?.timeout && options?.signal) {
    const combinedController = new AbortController();
    let abortHandlerCalled = false;
    
    const abortHandler = () => {
      // Prevent multiple calls to abort on the same controller
      if (abortHandlerCalled || combinedController.signal.aborted) {
        return;
      }
      
      abortHandlerCalled = true;
      
      try {
        // Use a more defensive approach to avoid throwing during cleanup
        if (combinedController && !combinedController.signal.aborted) {
          // Check if we can safely abort without throwing
          const reason = 'Request cancelled by component unmount or navigation';
          if ('abort' in combinedController && typeof combinedController.abort === 'function') {
            combinedController.abort(reason);
          }
        }
      } catch (error) {
        // Completely suppress abort errors during cleanup - these are expected
        // Don't even log them as they create noise in the console
      }
    };
    
    // Add listeners with cleanup tracking - check if signals are already aborted
    if (!options.signal.aborted) {
      options.signal.addEventListener('abort', abortHandler);
    } else {
      // Signal is already aborted, trigger handler immediately
      abortHandler();
    }
    
    if (!timeoutController.signal.aborted) {
      timeoutController.signal.addEventListener('abort', abortHandler);
    }
    
    // Track cleanup function
    signalCleanup = () => {
      try {
        // Only remove listeners if they were actually added
        if (options.signal && !options.signal.aborted) {
          options.signal.removeEventListener('abort', abortHandler);
        }
        if (!timeoutController.signal.aborted) {
          timeoutController.signal.removeEventListener('abort', abortHandler);
        }
      } catch (error) {
        // Ignore cleanup errors - signals might already be aborted
        console.debug('Signal cleanup warning in apiRequest:', error);
      }
    };
    
    signal = combinedController.signal;
  } else if (options?.timeout) {
    signal = timeoutController.signal;
  }
  
  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
      credentials: "include",
      signal,
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Enhanced error context for better categorization
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        // Check if this is a user-initiated abort (component unmount) vs timeout
        if (options?.signal?.aborted) {
          // User-initiated abort (component unmount) - suppress the error
          const abortError = new Error('Request aborted due to component unmount');
          (abortError as any).name = 'ComponentAbortError';
          (abortError as any).status = 0;
          (abortError as any).suppressLog = true; // Flag to suppress logging
          throw abortError;
        } else {
          // Timeout abort
          const timeoutError = new Error(`Request timeout after ${options?.timeout || 'unknown'}ms: ${method} ${url}`);
          (timeoutError as any).name = 'TimeoutError';
          (timeoutError as any).status = 0;
          throw timeoutError;
        }
      }
      // Add request context to error
      (error as any).method = method;
      (error as any).url = url;
    }
    throw error;
  } finally {
    // Clean up timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // Clean up signal listeners
    if (signalCleanup) {
      signalCleanup();
    }
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
  timeout?: number;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior, timeout = 30000 }) =>
  async ({ queryKey, signal }) => {
    // Create timeout controller
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      timeoutController.abort();
    }, timeout);
    
    // Combine signals with proper cleanup and race condition protection
    const combinedController = new AbortController();
    let abortHandlerCalled = false;
    
    const abortHandler = () => {
      // Prevent multiple calls to abort on the same controller
      if (abortHandlerCalled || combinedController.signal.aborted) {
        return;
      }
      
      abortHandlerCalled = true;
      
      try {
        // Use defensive approach to avoid throwing during query cleanup
        if (combinedController && !combinedController.signal.aborted) {
          const reason = 'Query cancelled by React Query or component unmount';
          if ('abort' in combinedController && typeof combinedController.abort === 'function') {
            combinedController.abort(reason);
          }
        }
      } catch (error) {
        // Suppress all abort errors during query cleanup - these are expected
      }
    };
    
    // Track signal cleanup
    let signalCleanup: (() => void) | undefined;
    
    // Only add listeners if signals are not already aborted
    if (signal && !signal.aborted) {
      signal.addEventListener('abort', abortHandler);
    } else if (signal && signal.aborted) {
      // Signal is already aborted, trigger handler immediately
      abortHandler();
    }
    
    if (!timeoutController.signal.aborted) {
      timeoutController.signal.addEventListener('abort', abortHandler);
    }
    
    signalCleanup = () => {
      try {
        // Only remove listeners if they were actually added and signals aren't aborted
        if (signal && !signal.aborted) {
          signal.removeEventListener('abort', abortHandler);
        }
        if (!timeoutController.signal.aborted) {
          timeoutController.signal.removeEventListener('abort', abortHandler);
        }
        
        // Reset the flag to prevent further issues
        abortHandlerCalled = false;
      } catch (error) {
        console.debug('Query signal cleanup warning:', error);
      }
    };
    
    try {
      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
        signal: combinedController.signal,
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      if (error instanceof Error && (error.name === 'AbortError' || error.message?.includes('signal is aborted'))) {
        // Check if this is a normal query cancellation vs timeout
        const isTimeout = timeoutController.signal.aborted;
        const isQueryCancellation = signal && signal.aborted && !isTimeout;
        
        if (isQueryCancellation) {
          // This is a normal query cancellation (e.g., component unmounting)
          // Return null directly without Promise wrapper to avoid unhandled rejection
          return null;
        }
        
        if (isTimeout) {
          const timeoutError = new Error(`Query timeout after ${timeout}ms: ${queryKey.join('/')}`);
          (timeoutError as any).name = 'TimeoutError';
          (timeoutError as any).status = 0;
          throw timeoutError;
        }
        
        // Unknown abort reason - return null directly to avoid unhandled promise rejection
        return null;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      
      // Clean up signal listeners
      if (signalCleanup) {
        signalCleanup();
      }
    }
  };

/**
 * Smart retry function that uses error categorization to determine retry behavior
 */
function createSmartRetryFn(maxRetries: number = 3) {
  return (failureCount: number, error: DefaultError): boolean => {
    if (failureCount >= maxRetries) {
      return false;
    }

    // Categorize the error to determine retry behavior
    const categorizedError = categorizeError(error as Error);
    const metadata = getErrorMetadata(categorizedError.type);
    
    // Log retry attempt for monitoring
    console.log(`Query retry attempt ${failureCount + 1}/${maxRetries}`, {
      errorType: categorizedError.type,
      canRetry: metadata.canRetry,
      message: categorizedError.message,
      originalError: error
    });
    
    // Record retry attempt for metrics
    if (typeof window !== 'undefined') {
      // Only record metrics in browser environment
      errorMetrics.recordRetry(categorizedError.type);
    }
    
    // Don't retry if the error type is not retryable
    if (!metadata.canRetry) {
      console.log(`Skipping retry for non-retryable error type: ${categorizedError.type}`);
      return false;
    }
    
    // Don't retry validation errors, position value errors, or cancelled operations
    if (categorizedError.type === ErrorType.VALIDATION || 
        categorizedError.type === ErrorType.POSITION_VALUE ||
        categorizedError.type === ErrorType.FILE_FORMAT ||
        categorizedError.type === ErrorType.AUTHENTICATION ||
        categorizedError.type === ErrorType.CANCELLED) {
      console.log(`Skipping retry for non-retriable error: ${categorizedError.type}`);
      return false;
    }
    
    // Retry network, server, and unknown errors
    return categorizedError.type === ErrorType.NETWORK ||
           categorizedError.type === ErrorType.SERVER ||
           categorizedError.type === ErrorType.UNKNOWN;
  };
}

/**
 * Smart retry delay function that adapts based on error type
 */
function createSmartRetryDelay() {
  return (attemptIndex: number, error: DefaultError): number => {
    const categorizedError = categorizeError(error as Error);
    
    let baseDelay: number;
    let maxDelay: number;
    
    switch (categorizedError.type) {
      case ErrorType.NETWORK:
        // Longer delays for network errors
        baseDelay = 2000;
        maxDelay = 60000; // 1 minute max
        break;
      case ErrorType.SERVER:
        // Medium delays for server errors
        baseDelay = 1500;
        maxDelay = 30000; // 30 seconds max
        break;
      case ErrorType.UPLOAD:
        // Shorter delays for upload errors
        baseDelay = 1000;
        maxDelay = 15000; // 15 seconds max
        break;
      default:
        // Standard exponential backoff
        baseDelay = 1000;
        maxDelay = 30000;
    }
    
    const delay = Math.min(baseDelay * Math.pow(2, attemptIndex), maxDelay);
    
    console.log(`Retry delay for ${categorizedError.type}: ${delay}ms (attempt ${attemptIndex + 1})`);
    
    return delay;
  };
}

/**
 * Enhanced query client with error-type-aware retry logic
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: createSmartRetryFn(3),
      retryDelay: createSmartRetryDelay(),
      // Add error logging for monitoring
      onError: (error: DefaultError) => {
        // Handle null returns from cancelled queries
        if (!error) {
          return;
        }
        
        // Early return for any cancellation-related errors to prevent them from propagating
        if (error && typeof error === 'object') {
          const errorMessage = (error as Error)?.message || '';
          const errorName = (error as any)?.name || '';
          
          if (errorMessage.includes('Query cancelled') ||
              errorMessage.includes('signal is aborted') ||
              errorMessage.includes('Request aborted') ||
              errorMessage.includes('component unmount') ||
              errorName === 'AbortError' ||
              errorName === 'CancelledError' ||
              errorName === 'ComponentAbortError' ||
              (error as any)?.isCancelled ||
              (error as any)?.suppressLog) {
            // Completely suppress - don't even categorize or record metrics
            return;
          }
        }
        
        const categorizedError = categorizeError(error as Error);
        
        // Additional check after categorization
        if (categorizedError.type === ErrorType.CANCELLED) {
          return;
        }
        
        errorMetrics.recordError(categorizedError);
        console.error('Query error:', {
          type: categorizedError.type,
          message: categorizedError.message,
          details: categorizedError.details,
          originalError: error
        });
      },
    },
    mutations: {
      retry: createSmartRetryFn(1), // More conservative retry for mutations
      retryDelay: createSmartRetryDelay(),
      // Add error logging for monitoring
      onError: (error: DefaultError) => {
        // Handle null returns from cancelled mutations
        if (!error) {
          console.debug('Mutation returned null (likely cancelled)');
          return;
        }
        
        const categorizedError = categorizeError(error as Error);
        
        // Don't log cancelled mutations as errors
        if (categorizedError.type === ErrorType.CANCELLED ||
            (error as any)?.name === 'CancelledError' ||
            (error as any)?.isCancelled ||
            (error as Error)?.name === 'AbortError' ||
            (error as Error)?.message?.includes('signal is aborted') ||
            (error as Error)?.message?.includes('Request aborted') ||
            (error as Error)?.message?.includes('Query cancelled')) {
          // Completely suppress logging for aborted mutations to reduce console noise
          return;
        }
        
        errorMetrics.recordError(categorizedError);
        console.error('Mutation error:', {
          type: categorizedError.type,
          message: categorizedError.message,
          details: categorizedError.details,
          affectedData: categorizedError.affectedData,
          originalError: error
        });
      },
    },
  },
});

/**
 * Specialized query client configurations for different use cases
 */
export const createMutationOptions = <TData = unknown, TError = DefaultError, TVariables = void, TContext = unknown>(
  options: Partial<MutationOptions<TData, TError, TVariables, TContext>> & {
    errorType?: ErrorType;
  } = {}
): MutationOptions<TData, TError, TVariables, TContext> => {
  const { errorType, ...mutationOptions } = options;
  
  return {
    ...mutationOptions,
    retry: (failureCount, error) => {
      // Use custom retry logic if provided
      if (mutationOptions.retry) {
        return typeof mutationOptions.retry === 'function' 
          ? mutationOptions.retry(failureCount, error, {} as any)
          : mutationOptions.retry;
      }
      
      // Use smart retry logic based on expected error type
      if (errorType) {
        const metadata = getErrorMetadata(errorType);
        return failureCount < 1 && metadata.canRetry;
      }
      
      // Default: use smart retry with single attempt
      return createSmartRetryFn(1)(failureCount, error);
    },
    retryDelay: mutationOptions.retryDelay || createSmartRetryDelay(),
  };
};

export const createQueryOptions = <TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends readonly unknown[] = readonly unknown[]>(
  options: Partial<QueryOptions<TQueryFnData, TError, TData, TQueryKey>> & {
    timeout?: number;
    expectedErrorTypes?: ErrorType[];
  } = {}
): QueryOptions<TQueryFnData, TError, TData, TQueryKey> => {
  const { timeout, expectedErrorTypes, ...queryOptions } = options;
  
  return {
    ...queryOptions,
    queryFn: queryOptions.queryFn || getQueryFn({ on401: "throw", timeout }),
    retry: (failureCount, error) => {
      // Use custom retry logic if provided
      if (queryOptions.retry) {
        return typeof queryOptions.retry === 'function'
          ? queryOptions.retry(failureCount, error, {} as any)
          : queryOptions.retry;
      }
      
      // Use smart retry logic
      return createSmartRetryFn(3)(failureCount, error);
    },
    retryDelay: queryOptions.retryDelay || createSmartRetryDelay(),
  };
};

/**
 * Utility functions for error monitoring and analytics
 */
export const errorMetrics = {
  errorCounts: new Map<ErrorType, number>(),
  retryAttempts: new Map<ErrorType, number>(),
  
  recordError(error: ErrorInfo) {
    const current = this.errorCounts.get(error.type) || 0;
    this.errorCounts.set(error.type, current + 1);
  },
  
  recordRetry(errorType: ErrorType) {
    const current = this.retryAttempts.get(errorType) || 0;
    this.retryAttempts.set(errorType, current + 1);
  },
  
  getMetrics() {
    return {
      errorCounts: Object.fromEntries(this.errorCounts),
      retryAttempts: Object.fromEntries(this.retryAttempts),
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      totalRetries: Array.from(this.retryAttempts.values()).reduce((sum, count) => sum + count, 0),
    };
  },
  
  reset() {
    this.errorCounts.clear();
    this.retryAttempts.clear();
  }
};

// Global error suppression for React Query cancellation errors
if (typeof window !== 'undefined') {
  // Suppress unhandled promise rejections from cancelled queries
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    // Check if this is a query cancellation error
    if (error && typeof error === 'object') {
      const errorMessage = error.message || '';
      const errorName = error.name || '';
      
      const isCancellationError = 
        errorMessage.includes('Query cancelled') ||
        errorMessage.includes('signal is aborted') ||
        errorMessage.includes('Request aborted') ||
        errorMessage.includes('component unmount') ||
        errorName === 'CancelledError' ||
        errorName === 'AbortError' ||
        errorName === 'ComponentAbortError' ||
        error.isCancelled ||
        error.suppressLog;
      
      if (isCancellationError) {
        // Prevent the error from appearing in the console
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }
    }
  });

  // Also suppress regular error events for cancelled queries
  window.addEventListener('error', (event) => {
    const error = event.error;
    
    if (error && typeof error === 'object') {
      const errorMessage = error.message || '';
      const errorName = error.name || '';
      
      const isCancellationError = 
        errorMessage.includes('Query cancelled') ||
        errorMessage.includes('signal is aborted') ||
        errorMessage.includes('Request aborted') ||
        errorMessage.includes('component unmount') ||
        errorName === 'CancelledError' ||
        errorName === 'AbortError' ||
        errorName === 'ComponentAbortError' ||
        error.isCancelled ||
        error.suppressLog;
      
      if (isCancellationError) {
        // Prevent the error from appearing in the console
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }
    }
  }, true); // Use capture phase to catch errors before devtools
  
  // Additional suppression for devtools that might intercept errors
  const originalConsoleError = console.error;
  console.error = function(...args) {
    // Check if any argument contains cancellation error text
    const hasQueryCancelMessage = args.some(arg => {
      if (typeof arg === 'string') {
        return arg.includes('Query cancelled') || 
               arg.includes('component unmount') ||
               arg.includes('signal is aborted');
      }
      if (arg && typeof arg === 'object' && arg.message) {
        return arg.message.includes('Query cancelled') ||
               arg.message.includes('component unmount') ||
               arg.message.includes('signal is aborted');
      }
      return false;
    });
    
    if (!hasQueryCancelMessage) {
      originalConsoleError.apply(console, args);
    }
  };
}
