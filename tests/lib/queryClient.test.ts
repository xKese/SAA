import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest, queryClient, createMutationOptions, createQueryOptions, errorMetrics } from '@/lib/queryClient';
import { ErrorType } from '@/types/errors';

// Mock fetch globally
global.fetch = vi.fn();

const mockFetch = fetch as ReturnType<typeof vi.fn>;

describe('Query Client Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    errorMetrics.reset();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('apiRequest Function', () => {
    it('should make successful API request', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      mockFetch.mockResolvedValue(mockResponse);

      const response = await apiRequest('GET', '/api/test');
      
      expect(fetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {},
        body: undefined,
        credentials: 'include',
        signal: undefined
      });
      expect(response.status).toBe(200);
    });

    it('should handle JSON data in request body', async () => {
      const mockResponse = new Response('{}', { status: 200 });
      mockFetch.mockResolvedValue(mockResponse);

      const testData = { name: 'test', value: 123 };
      await apiRequest('POST', '/api/test', testData);

      expect(fetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
        credentials: 'include',
        signal: undefined
      });
    });

    it('should handle FormData in request body', async () => {
      const mockResponse = new Response('{}', { status: 200 });
      mockFetch.mockResolvedValue(mockResponse);

      const formData = new FormData();
      formData.append('file', new Blob(['test']));
      
      await apiRequest('POST', '/api/upload', formData);

      expect(fetch).toHaveBeenCalledWith('/api/upload', {
        method: 'POST',
        headers: {},
        body: formData,
        credentials: 'include',
        signal: undefined
      });
    });

    it('should throw error for non-ok responses', async () => {
      const mockResponse = new Response('Bad Request', { status: 400, statusText: 'Bad Request' });
      mockFetch.mockResolvedValue(mockResponse);

      await expect(apiRequest('POST', '/api/test')).rejects.toThrow('400: Bad Request');
    });

    it('should handle timeout with AbortController', async () => {
      vi.useFakeTimers();
      
      // Mock a delayed response
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(new Response('ok')), 2000))
      );

      const promise = apiRequest('GET', '/api/test', undefined, { timeout: 1000 });
      
      // Fast-forward time
      vi.advanceTimersByTime(1000);
      
      await expect(promise).rejects.toThrow(/Request timeout/);
      
      vi.useRealTimers();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(apiRequest('GET', '/api/test')).rejects.toThrow('Network error');
    });

    it('should handle AbortError as timeout', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      await expect(apiRequest('GET', '/api/test', undefined, { timeout: 5000 }))
        .rejects.toThrow(/Request timeout after 5000ms/);
    });

    it('should combine multiple abort signals', async () => {
      const mockResponse = new Response('{}', { status: 200 });
      mockFetch.mockResolvedValue(mockResponse);

      const externalController = new AbortController();
      await apiRequest('GET', '/api/test', undefined, { 
        timeout: 5000, 
        signal: externalController.signal 
      });

      expect(fetch).toHaveBeenCalled();
    });
  });

  describe('Smart Retry Logic', () => {
    it('should retry network errors', () => {
      const networkError = new Error('Network timeout');
      (networkError as any).name = 'TimeoutError';
      (networkError as any).status = 0;

      const retryFn = queryClient.getDefaultOptions().queries?.retry as Function;
      const shouldRetry = retryFn(0, networkError);

      expect(shouldRetry).toBe(true);
    });

    it('should retry server errors', () => {
      const serverError = new Error('500: Internal Server Error');
      (serverError as any).status = 500;

      const retryFn = queryClient.getDefaultOptions().queries?.retry as Function;
      const shouldRetry = retryFn(0, serverError);

      expect(shouldRetry).toBe(true);
    });

    it('should not retry validation errors', () => {
      const validationError = new Error('Validation failed: required field missing');

      const retryFn = queryClient.getDefaultOptions().queries?.retry as Function;
      const shouldRetry = retryFn(0, validationError);

      expect(shouldRetry).toBe(false);
    });

    it('should not retry position value errors', () => {
      const positionError = new Error('Position "AAPL" has invalid or missing value: undefined');

      const retryFn = queryClient.getDefaultOptions().queries?.retry as Function;
      const shouldRetry = retryFn(0, positionError);

      expect(shouldRetry).toBe(false);
    });

    it('should not retry file format errors', () => {
      const formatError = new Error('Unsupported file format');

      const retryFn = queryClient.getDefaultOptions().queries?.retry as Function;
      const shouldRetry = retryFn(0, formatError);

      expect(shouldRetry).toBe(false);
    });

    it('should not retry authentication errors', () => {
      const authError = new Error('401: Unauthorized');
      (authError as any).status = 401;

      const retryFn = queryClient.getDefaultOptions().queries?.retry as Function;
      const shouldRetry = retryFn(0, authError);

      expect(shouldRetry).toBe(false);
    });

    it('should stop retrying after max attempts', () => {
      const networkError = new Error('Network error');

      const retryFn = queryClient.getDefaultOptions().queries?.retry as Function;
      const shouldRetry = retryFn(3, networkError); // 4th attempt (0-indexed)

      expect(shouldRetry).toBe(false);
    });
  });

  describe('Smart Retry Delays', () => {
    it('should use longer delays for network errors', () => {
      const networkError = new Error('Network timeout');
      (networkError as any).name = 'TimeoutError';

      const delayFn = queryClient.getDefaultOptions().queries?.retryDelay as Function;
      const delay = delayFn(0, networkError);

      expect(delay).toBe(2000); // Base delay for network errors
    });

    it('should use medium delays for server errors', () => {
      const serverError = new Error('500: Server Error');
      (serverError as any).status = 500;

      const delayFn = queryClient.getDefaultOptions().queries?.retryDelay as Function;
      const delay = delayFn(0, serverError);

      expect(delay).toBe(1500); // Base delay for server errors
    });

    it('should use exponential backoff', () => {
      const networkError = new Error('Network error');

      const delayFn = queryClient.getDefaultOptions().queries?.retryDelay as Function;
      const delay1 = delayFn(0, networkError);
      const delay2 = delayFn(1, networkError);
      const delay3 = delayFn(2, networkError);

      expect(delay2).toBe(delay1 * 2);
      expect(delay3).toBe(delay1 * 4);
    });

    it('should cap delays at maximum values', () => {
      const networkError = new Error('Network error');

      const delayFn = queryClient.getDefaultOptions().queries?.retryDelay as Function;
      const delay = delayFn(10, networkError); // Very high attempt number

      expect(delay).toBeLessThanOrEqual(60000); // Max delay for network errors
    });
  });

  describe('createMutationOptions', () => {
    it('should create mutation options with smart retry', () => {
      const options = createMutationOptions();
      
      expect(options).toHaveProperty('retry');
      expect(options).toHaveProperty('retryDelay');
    });

    it('should use expected error type for retry decisions', () => {
      const options = createMutationOptions({ errorType: ErrorType.VALIDATION });
      const retryFn = options.retry as Function;
      
      // Should not retry validation errors even on first attempt
      const shouldRetry = retryFn(0, new Error('Validation error'));
      expect(shouldRetry).toBe(false);
    });

    it('should respect custom retry function', () => {
      const customRetry = vi.fn(() => true);
      const options = createMutationOptions({ retry: customRetry });
      
      const retryFn = options.retry as Function;
      retryFn(0, new Error('test'));
      
      expect(customRetry).toHaveBeenCalled();
    });

    it('should handle boolean retry option', () => {
      const options = createMutationOptions({ retry: false });
      
      expect(options.retry).toBe(false);
    });
  });

  describe('createQueryOptions', () => {
    it('should create query options with timeout', () => {
      const options = createQueryOptions({ timeout: 10000 });
      
      expect(options).toHaveProperty('queryFn');
      expect(options).toHaveProperty('retry');
      expect(options).toHaveProperty('retryDelay');
    });

    it('should use smart retry by default', () => {
      const options = createQueryOptions();
      const retryFn = options.retry as Function;
      
      const shouldRetry = retryFn(0, new Error('Network error'));
      expect(shouldRetry).toBe(true);
    });

    it('should respect custom retry function', () => {
      const customRetry = vi.fn(() => false);
      const options = createQueryOptions({ retry: customRetry });
      
      const retryFn = options.retry as Function;
      retryFn(0, new Error('test'));
      
      expect(customRetry).toHaveBeenCalled();
    });
  });

  describe('Error Metrics', () => {
    it('should record error occurrences', () => {
      const error = { type: ErrorType.VALIDATION, message: 'Test error' };
      
      errorMetrics.recordError(error as any);
      errorMetrics.recordError(error as any);
      
      const metrics = errorMetrics.getMetrics();
      expect(metrics.errorCounts[ErrorType.VALIDATION]).toBe(2);
      expect(metrics.totalErrors).toBe(2);
    });

    it('should record retry attempts', () => {
      errorMetrics.recordRetry(ErrorType.NETWORK);
      errorMetrics.recordRetry(ErrorType.NETWORK);
      errorMetrics.recordRetry(ErrorType.SERVER);
      
      const metrics = errorMetrics.getMetrics();
      expect(metrics.retryAttempts[ErrorType.NETWORK]).toBe(2);
      expect(metrics.retryAttempts[ErrorType.SERVER]).toBe(1);
      expect(metrics.totalRetries).toBe(3);
    });

    it('should reset metrics', () => {
      errorMetrics.recordError({ type: ErrorType.VALIDATION, message: 'Test' } as any);
      errorMetrics.recordRetry(ErrorType.NETWORK);
      
      let metrics = errorMetrics.getMetrics();
      expect(metrics.totalErrors).toBe(1);
      expect(metrics.totalRetries).toBe(1);
      
      errorMetrics.reset();
      
      metrics = errorMetrics.getMetrics();
      expect(metrics.totalErrors).toBe(0);
      expect(metrics.totalRetries).toBe(0);
    });
  });

  describe('Error Logging', () => {
    it('should log query errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const onError = queryClient.getDefaultOptions().queries?.onError as Function;
      const testError = new Error('Test error');
      
      onError(testError);
      
      expect(consoleSpy).toHaveBeenCalledWith('Query error:', expect.any(Object));
      
      consoleSpy.mockRestore();
    });

    it('should log mutation errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const onError = queryClient.getDefaultOptions().mutations?.onError as Function;
      const testError = new Error('Test mutation error');
      
      onError(testError);
      
      expect(consoleSpy).toHaveBeenCalledWith('Mutation error:', expect.any(Object));
      
      consoleSpy.mockRestore();
    });

    it('should log retry attempts', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const retryFn = queryClient.getDefaultOptions().queries?.retry as Function;
      const networkError = new Error('Network error');
      
      retryFn(0, networkError);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Query retry attempt'),
        expect.any(Object)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Query Function with Timeout', () => {
    it('should handle query timeout', async () => {
      vi.useFakeTimers();
      
      // Mock a delayed response
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(new Response('ok')), 35000))
      );

      const queryFn = queryClient.getDefaultOptions().queries?.queryFn as Function;
      const promise = queryFn({ queryKey: ['/api/test'] });
      
      // Fast-forward past default timeout (30s)
      vi.advanceTimersByTime(30000);
      
      await expect(promise).rejects.toThrow(/Query timeout/);
      
      vi.useRealTimers();
    });

    it('should handle successful query', async () => {
      const mockData = { id: 1, name: 'test' };
      mockFetch.mockResolvedValue(new Response(JSON.stringify(mockData), { status: 200 }));

      const queryFn = queryClient.getDefaultOptions().queries?.queryFn as Function;
      const result = await queryFn({ queryKey: ['/api/test'] });
      
      expect(result).toEqual(mockData);
    });

    it('should return null for 401 when configured', async () => {
      mockFetch.mockResolvedValue(new Response('Unauthorized', { status: 401 }));

      // Use the getQueryFn with on401: "returnNull"
      const { getQueryFn } = await import('@/lib/queryClient');
      const queryFn = getQueryFn({ on401: 'returnNull' });
      const result = await queryFn({ queryKey: ['/api/test'] });
      
      expect(result).toBeNull();
    });
  });
});