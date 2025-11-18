import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { authStore } from '../stores/auth-store';

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    roles: string[];
  };
}

export const useLogin = () => {
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
      return data;
    },
    onSuccess: (data) => {
      authStore.getState().setSession({ token: data.accessToken, user: data.user });
    },
  });
};
