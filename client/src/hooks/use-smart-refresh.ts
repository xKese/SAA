import { useEffect, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UseSmartRefreshOptions {
  queryKey: string[];
  condition: boolean;
  interval?: number;
  maxRefreshes?: number;
}

export function useSmartRefresh({
  queryKey,
  condition,
  interval = 3000,
  maxRefreshes = 120 // Stop after 6 minutes (120 * 3s)
}: UseSmartRefreshOptions) {
  const queryClient = useQueryClient();
  const refreshCountRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const shouldRefresh = useMemo(() => condition, [condition]);

  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Reset counter when condition changes
    if (!shouldRefresh) {
      refreshCountRef.current = 0;
      return;
    }

    // Start refreshing if condition is met and we haven't exceeded max refreshes
    if (shouldRefresh && refreshCountRef.current < maxRefreshes) {
      intervalRef.current = setInterval(() => {
        refreshCountRef.current += 1;
        queryClient.invalidateQueries({ queryKey });

        // Stop refreshing if we've reached max
        if (refreshCountRef.current >= maxRefreshes) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          console.warn(`Smart refresh stopped after ${maxRefreshes} attempts for query:`, queryKey);
        }
      }, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [shouldRefresh, queryKey, interval, maxRefreshes, queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    refreshCount: refreshCountRef.current,
    isRefreshing: shouldRefresh && refreshCountRef.current < maxRefreshes
  };
}