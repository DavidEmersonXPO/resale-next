import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface EbayPolicyRefreshLog {
  id: string;
  result: 'success' | 'failure';
  message?: string | null;
  createdAt: string;
}

export const useEbayPolicyLogs = (limit = 5) => {
  return useQuery({
    queryKey: ['ebay-policy-logs', limit],
    queryFn: async () => {
      const { data } = await apiClient.get<EbayPolicyRefreshLog[]>(
        '/ebay/policies/refresh/logs',
        { params: { limit } },
      );
      return data;
    },
    staleTime: 60_000,
  });
};
