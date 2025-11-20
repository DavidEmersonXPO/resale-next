import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { Paginated, Purchase } from '../types/purchase';

export interface PurchaseQueryOptions {
  limit?: number;
  offset?: number;
  source?: string;
  status?: string;
  search?: string;
}

export const usePurchases = (options?: PurchaseQueryOptions) => {
  return useQuery({
    queryKey: ['purchases', options],
    queryFn: async () => {
      const { data } = await apiClient.get<Paginated<Purchase>>('/purchases', {
        params: {
          limit: options?.limit ?? 10,
          offset: options?.offset ?? 0,
          source: options?.source,
          status: options?.status,
          search: options?.search,
        },
      });
      return data;
    },
  });
};
