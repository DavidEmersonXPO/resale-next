export interface EbayConnectionStatus {
  connected: boolean;
  message?: string;
  tokenValid?: boolean;
  refreshTokenValid?: boolean;
  tokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
  environment?: string;
  ebayUserId?: string;
  connectedAt?: string;
}

export type EbayPolicyType = 'PAYMENT' | 'FULFILLMENT' | 'RETURN';

export interface EbaySellerPolicy {
  id: string;
  policyId: string;
  marketplaceId: string;
  name: string;
  type: EbayPolicyType;
  isDefault?: boolean | null;
  policyData?: Record<string, unknown> | null;
  fetchedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface EbayPolicyDefaults {
  categoryId: string | null;
  paymentPolicyId: string | null;
  fulfillmentPolicyId: string | null;
  returnPolicyId: string | null;
}

export interface EbayPolicyCollection {
  marketplaceId: string;
  paymentPolicies: EbaySellerPolicy[];
  fulfillmentPolicies: EbaySellerPolicy[];
  returnPolicies: EbaySellerPolicy[];
  lastSyncedAt: string | null;
  defaults: EbayPolicyDefaults;
}
