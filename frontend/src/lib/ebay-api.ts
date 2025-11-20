import { apiClient } from './api-client';
import type { EbayConnectionStatus, EbayPolicyCollection, EbayPolicyDefaults } from '../types/ebay';

export const getEbayAuthUrl = async () => {
  const { data } = await apiClient.get<{ url: string }>('/ebay/auth/url');
  return data;
};

export const getEbayConnectionStatus = async () => {
  const { data } = await apiClient.get<EbayConnectionStatus>('/ebay/connection/status');
  return data;
};

export const disconnectEbay = async () => {
  const { data } = await apiClient.post('/ebay/connection/disconnect');
  return data;
};

export const fetchEbayPolicies = async () => {
  const { data } = await apiClient.get<EbayPolicyCollection>('/ebay/policies');
  return data;
};

export const refreshEbayPolicies = async () => {
  const { data } = await apiClient.post<EbayPolicyCollection>('/ebay/policies/refresh');
  return data;
};

export const updateEbayDefaults = async (payload: Partial<EbayPolicyDefaults> & { categoryId?: string | null }) => {
  const { data } = await apiClient.post<{ defaults: EbayPolicyDefaults }>('/ebay/policies/defaults', payload);
  return data;
};
