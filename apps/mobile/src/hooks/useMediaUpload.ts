import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface UploadPayload {
  purchaseItemId: string;
  file: {
    uri: string;
    name: string;
    type: string;
  };
}

export const useMediaUpload = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ purchaseItemId, file }: UploadPayload) => {
      const formData = new FormData();
      formData.append('purchaseItemId', purchaseItemId);
      formData.append('file', file as any);
      const { data } = await apiClient.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mobile-purchases'] }),
  });
};
