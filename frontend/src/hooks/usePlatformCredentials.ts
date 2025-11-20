import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { ListingPlatformCredential } from '../types/listing';

export type PlatformCredential = ListingPlatformCredential;

export const usePlatformCredentials = () => {
  return useQuery({
    queryKey: ['platform-credentials'],
    queryFn: async () => {
      const { data } = await apiClient.get<PlatformCredential[]>('/platform-credentials');
      return data;
    },
  });
};
