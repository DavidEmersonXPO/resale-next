import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface ListingTemplate {
  id: string;
  name: string;
  description?: string | null;
  vertical: string;
  defaultData: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export const useListingTemplates = () => {
  return useQuery({
    queryKey: ['listing-templates'],
    queryFn: async () => {
      const { data } = await apiClient.get<ListingTemplate[]>('/listing-templates');
      return data;
    },
  });
};
