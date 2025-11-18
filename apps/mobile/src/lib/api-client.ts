import axios from 'axios';
import { authStore } from '../stores/auth-store';

const baseURL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = authStore.getState().token;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
