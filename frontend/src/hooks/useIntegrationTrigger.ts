import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface TriggerPayload {
  path: string;
  payload: Record<string, unknown>;
}

export const useIntegrationTrigger = () => {
  return useMutation({
    mutationFn: async ({ path, payload }: TriggerPayload) => {
      const { data } = await apiClient.post(path, payload);
      return data;
    },
  });
};
