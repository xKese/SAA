import { useQuery, type UseQueryResult } from "@tanstack/react-query";

export interface InvestmentUniverseItem {
  name: string;
  isin?: string;
  assetClass: string;
  category: string;
  factsheetPath: string;
  hasFactsheet: boolean;
  fileName: string;
  confidence: number;
  factsheetData?: {
    fullName?: string;
    ter?: number;
    assetAllocation?: Record<string, number>;
    geographicAllocation?: Record<string, number>;
  };
}

export interface InvestmentUniverseResponse {
  success: boolean;
  instruments: InvestmentUniverseItem[];
  totalCount: number;
  categories: string[];
  assetClasses: string[];
  pagination?: {
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface InvestmentUniverseSearchParams {
  assetClass?: string;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const useInvestmentUniverse = (
  params?: InvestmentUniverseSearchParams
): UseQueryResult<InvestmentUniverseResponse> => {
  const queryParams = new URLSearchParams();
  
  if (params?.assetClass) queryParams.append('assetClass', params.assetClass);
  if (params?.category) queryParams.append('category', params.category);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  
  const queryString = queryParams.toString();
  const url = `/api/investment-universe${queryString ? `?${queryString}` : ''}`;
  
  return useQuery<InvestmentUniverseResponse>({
    queryKey: [url],
    queryFn: async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch investment universe');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (updated from cacheTime)
  });
};

export const useInvestmentUniverseSearch = (
  searchQuery: string,
  limit = 20
): UseQueryResult<InvestmentUniverseResponse> => {
  return useQuery<InvestmentUniverseResponse>({
    queryKey: [`/api/investment-universe/search?query=${encodeURIComponent(searchQuery)}&limit=${limit}`],
    queryFn: async () => {
      const url = `/api/investment-universe/search?query=${encodeURIComponent(searchQuery)}&limit=${limit}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to search investment universe');
      }
      return response.json();
    },
    enabled: searchQuery.length >= 2, // Only search when at least 2 characters
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useInvestmentUniverseByAssetClass = (
  assetClass: string
): UseQueryResult<InvestmentUniverseResponse> => {
  return useQuery<InvestmentUniverseResponse>({
    queryKey: [`/api/investment-universe/asset-class/${encodeURIComponent(assetClass)}`],
    queryFn: async () => {
      const url = `/api/investment-universe/asset-class/${encodeURIComponent(assetClass)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch investment universe by asset class');
      }
      return response.json();
    },
    enabled: !!assetClass,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};