import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export const useIntegrationTrigger = () => {
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.post('/integrations/goodwill/manifests', payload);
      return data;
    },
  });
};
