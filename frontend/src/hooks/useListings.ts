import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { Paginated } from '../types/purchase';
import type { Listing } from '../types/listing';

export const useListings = () => {
  return useQuery({
    queryKey: ['listings'],
    queryFn: async () => {
      const { data } = await apiClient.get<Paginated<Listing>>('/listings', {
        params: { limit: 10 },
      });
      return data;
    },
  });
};
