import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { authStore } from '../stores/auth-store';

interface LoginPayload {
  email: string;
  password: string;
}

export const useLogin = () => {
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await apiClient.post('/auth/login', payload);
      return data;
    },
    onSuccess: async (data) => {
      await authStore.getState().setSession({ token: data.accessToken, user: data.user });
    },
  });
};
