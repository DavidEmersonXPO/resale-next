import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { fetchEbayPolicies } from '../lib/ebay-api';
import type { EbayPolicyCollection } from '../types/ebay';

export const useEbayPolicies = (enabled = true, options?: Partial<UseQueryOptions<EbayPolicyCollection>>) => {
  return useQuery<EbayPolicyCollection>({
    queryKey: ['ebay-policies'],
    queryFn: fetchEbayPolicies,
    enabled,
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};
