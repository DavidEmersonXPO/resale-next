import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { Paginated, Purchase } from '../types/purchase';

export const usePurchases = () => {
  return useQuery({
    queryKey: ['purchases'],
    queryFn: async () => {
      const { data } = await apiClient.get<Paginated<Purchase>>('/purchases', {
        params: { limit: 10 },
      });
      return data;
    },
  });
};
