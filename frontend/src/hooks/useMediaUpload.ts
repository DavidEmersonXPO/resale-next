import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface UploadPayload {
  purchaseItemId?: string;
  listingId?: string;
  file: File;
}

export const useMediaUpload = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ purchaseItemId, listingId, file }: UploadPayload) => {
      const formData = new FormData();
      formData.append('file', file);
      if (purchaseItemId) {
        formData.append('purchaseItemId', purchaseItemId);
      }
      if (listingId) {
        formData.append('listingId', listingId);
      }
      const { data } = await apiClient.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
};
