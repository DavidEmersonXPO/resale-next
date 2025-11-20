import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { apiClient } from '../lib/api-client';
import { usePlatformCredentials } from '../hooks/usePlatformCredentials';
import {
  getEbayAuthUrl,
  getEbayConnectionStatus,
  disconnectEbay,
  refreshEbayPolicies,
  updateEbayDefaults,
} from '../lib/ebay-api';
import type { ListingPlatformCredential } from '../types/listing';
import type { EbayConnectionStatus, EbaySellerPolicy } from '../types/ebay';
import { useEbayPolicies } from '../hooks/useEbayPolicies';

type CredentialNotice = { type: 'success' | 'error'; message: string } | null;

interface GoodwillCredential {
  username?: string;
  autoSyncEnabled: boolean;
  lastSyncedAt?: string | null;
  lastSyncStatus?: string | null;
  lastSyncMessage?: string | null;
  isConfigured: boolean;
}

interface SalvationCredential extends GoodwillCredential {}

type GeneralPlatform =
  | 'FACEBOOK_MARKETPLACE'
  | 'OFFERUP'
  | 'POSHMARK'
  | 'MERCARI'
  | 'OTHER';

const generalPlatformConfigs: Record<
  GeneralPlatform,
  {
    label: string;
    description: string;
    fields: Array<'accountName' | 'username' | 'password' | 'apiKey'>;
    accountPlaceholder?: string;
  }
> = {
  FACEBOOK_MARKETPLACE: {
    label: 'Facebook Marketplace',
    description: 'Use your Facebook login. Password is stored encrypted and only used to prefill listing flows.',
    fields: ['accountName', 'username', 'password'],
    accountPlaceholder: 'Personal or shop name',
  },
  OFFERUP: {
    label: 'OfferUp',
    description: 'Stored for headless form filling. Use a burner account when possible.',
    fields: ['accountName', 'username', 'password'],
  },
  POSHMARK: {
    label: 'Poshmark',
    description: 'Required for listing composer autofill.',
    fields: ['accountName', 'username', 'password'],
  },
  MERCARI: {
    label: 'Mercari',
    description: 'Used for template kits and listing automation research.',
    fields: ['accountName', 'username', 'password'],
  },
  OTHER: {
    label: 'Other platform / API token',
    description: 'Store a generic API key or token for manual adapters.',
    fields: ['accountName', 'apiKey'],
  },
};

const generalPlatforms = Object.keys(generalPlatformConfigs) as GeneralPlatform[];

const ebayDocsUrl = 'https://developer.ebay.com/my/keys';

export const PlatformCredentialsPage = () => {
  const queryClient = useQueryClient();
  const { data: platformCredentials = [] } = usePlatformCredentials();
  const { data: goodwillCredential } = useQuery({
    queryKey: ['goodwill-credential'],
    queryFn: async () => {
      const { data } = await apiClient.get<GoodwillCredential>('/integrations/goodwill/credential');
      return data;
    },
  });
  const { data: salvationCredential } = useQuery({
    queryKey: ['salvation-credential'],
    queryFn: async () => {
      const { data } = await apiClient.get<SalvationCredential>('/integrations/salvation-army/credential');
      return data;
    },
  });

  const [shopGoodwillForm, setShopGoodwillForm] = useState({
    username: '',
    password: '',
    autoSyncEnabled: true,
  });
  const [salvationForm, setSalvationForm] = useState({
    username: '',
    password: '',
    autoSyncEnabled: true,
  });
  const [generalForm, setGeneralForm] = useState({
    platform: generalPlatforms[0],
    accountName: '',
    username: '',
    password: '',
    apiKey: '',
    isActive: true,
    editingId: '' as string | null,
  });
  const [notice, setNotice] = useState<CredentialNotice>(null);
  const [, setSearchParams] = useSearchParams();
  const [ebayStatus, setEbayStatus] = useState<EbayConnectionStatus | null>(null);
  const [ebayLoading, setEbayLoading] = useState(true);
  const [ebayDefaultsForm, setEbayDefaultsForm] = useState({
    categoryId: '',
    paymentPolicyId: '',
    fulfillmentPolicyId: '',
    returnPolicyId: '',
  });
  const [defaultsInitialized, setDefaultsInitialized] = useState(false);
  const {
    data: ebayPolicies,
    isLoading: policiesLoading,
    isFetching: policiesFetching,
  } = useEbayPolicies(Boolean(ebayStatus?.connected));

  useEffect(() => {
    if (goodwillCredential) {
      setShopGoodwillForm({
        username: goodwillCredential.username ?? '',
        password: '',
        autoSyncEnabled: goodwillCredential.autoSyncEnabled ?? true,
      });
    }
  }, [goodwillCredential]);

  useEffect(() => {
    if (salvationCredential) {
      setSalvationForm({
        username: salvationCredential.username ?? '',
        password: '',
        autoSyncEnabled: salvationCredential.autoSyncEnabled ?? true,
      });
    }
  }, [salvationCredential]);

  const goodwillMutation = useMutation({
    mutationFn: async () => {
      if (!shopGoodwillForm.username.trim()) {
        throw new Error('Username is required');
      }
      const payload: Record<string, unknown> = {
        username: shopGoodwillForm.username.trim(),
        autoSyncEnabled: shopGoodwillForm.autoSyncEnabled,
      };
      if (shopGoodwillForm.password.trim()) {
        payload.password = shopGoodwillForm.password;
      }
      const { data } = await apiClient.post('/integrations/goodwill/credential', payload);
      return data;
    },
    onSuccess: () => {
      setNotice({ type: 'success', message: 'ShopGoodwill credential saved.' });
      setShopGoodwillForm((prev) => ({ ...prev, password: '' }));
      void queryClient.invalidateQueries({ queryKey: ['goodwill-credential'] });
    },
    onError: (error) => handleError(error, 'Unable to save ShopGoodwill credential.'),
  });

  const salvationMutation = useMutation({
    mutationFn: async () => {
      if (!salvationForm.username.trim()) {
        throw new Error('Username is required');
      }
      const payload: Record<string, unknown> = {
        username: salvationForm.username.trim(),
        autoSyncEnabled: salvationForm.autoSyncEnabled,
      };
      if (salvationForm.password.trim()) {
        payload.password = salvationForm.password;
      }
      const { data } = await apiClient.post('/integrations/salvation-army/credential', payload);
      return data;
    },
    onSuccess: () => {
      setNotice({ type: 'success', message: 'Salvation Army credential saved.' });
      setSalvationForm((prev) => ({ ...prev, password: '' }));
      void queryClient.invalidateQueries({ queryKey: ['salvation-credential'] });
    },
    onError: (error) => handleError(error, 'Unable to save Salvation Army credential.'),
  });

  const generalMutation = useMutation({
    mutationFn: async () => {
      const config = generalPlatformConfigs[generalForm.platform];
      if (config.fields.includes('accountName') && !generalForm.accountName.trim()) {
        throw new Error('Account label is required.');
      }
      const metadata: Record<string, unknown> = {};
      if (config.fields.includes('username') && generalForm.username.trim()) {
        metadata.username = generalForm.username.trim();
      }
      let secret: string | undefined;
      if (config.fields.includes('password')) {
        secret = generalForm.password.trim();
        if (!generalForm.editingId && !secret) {
          throw new Error('Password is required.');
        }
      }
      if (config.fields.includes('apiKey')) {
        secret = generalForm.apiKey.trim();
        if (!secret) {
          throw new Error('API key is required.');
        }
      }

      const payload: Record<string, unknown> = {
        platform: generalForm.platform,
        accountName: generalForm.accountName.trim(),
        metadata,
        isActive: generalForm.isActive,
      };
      if (secret) {
        payload.secret = secret;
      }

      if (generalForm.editingId) {
        const { data } = await apiClient.patch(`/platform-credentials/${generalForm.editingId}`, payload);
        return data;
      }
      const { data } = await apiClient.post('/platform-credentials', payload);
      return data;
    },
    onSuccess: () => {
      setNotice({ type: 'success', message: 'Channel credential saved.' });
      setGeneralForm((prev) => ({
        ...prev,
        accountName: '',
        username: '',
        password: '',
        apiKey: '',
        editingId: null,
      }));
      void queryClient.invalidateQueries({ queryKey: ['platform-credentials'] });
    },
    onError: (error) => handleError(error, 'Unable to save platform credential.'),
  });

  const currentGeneralConfig = generalPlatformConfigs[generalForm.platform];

  const policyOptionLabel = (policy: EbaySellerPolicy) =>
    `${policy.name}${policy.isDefault ? ' (Default)' : ''} · ${policy.policyId}`;

  const refreshPoliciesMutation = useMutation({
    mutationFn: refreshEbayPolicies,
    onSuccess: (data) => {
      queryClient.setQueryData(['ebay-policies'], data);
      setDefaultsInitialized(false);
      setNotice({ type: 'success', message: 'Fetched policies from eBay Seller Hub.' });
    },
    onError: (error) => handleError(error, 'Unable to refresh eBay policies.'),
  });

  const updateEbayDefaultsMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        categoryId: ebayDefaultsForm.categoryId.trim() || null,
        paymentPolicyId: ebayDefaultsForm.paymentPolicyId.trim() || null,
        fulfillmentPolicyId: ebayDefaultsForm.fulfillmentPolicyId.trim() || null,
        returnPolicyId: ebayDefaultsForm.returnPolicyId.trim() || null,
      };
      return updateEbayDefaults(payload);
    },
    onSuccess: (response) => {
      setDefaultsInitialized(false);
      setEbayDefaultsForm({
        categoryId: response.defaults.categoryId ?? '',
        paymentPolicyId: response.defaults.paymentPolicyId ?? '',
        fulfillmentPolicyId: response.defaults.fulfillmentPolicyId ?? '',
        returnPolicyId: response.defaults.returnPolicyId ?? '',
      });
      setNotice({ type: 'success', message: 'eBay listing defaults saved.' });
      void queryClient.invalidateQueries({ queryKey: ['ebay-policies'] });
    },
    onError: (error) => handleError(error, 'Unable to save eBay defaults.'),
  });

  const handleEditGeneral = (credential: ListingPlatformCredential) => {
    setGeneralForm({
      platform: credential.platform as GeneralPlatform,
      accountName: credential.accountName ?? '',
      username: typeof credential.metadata?.username === 'string' ? String(credential.metadata.username) : '',
      password: '',
      apiKey: '',
      isActive: credential.isActive ?? true,
      editingId: credential.id,
    });
    setNotice(null);
  };

  const resetGeneralForm = () => {
    setGeneralForm({
      platform: generalPlatforms[0],
      accountName: '',
      username: '',
      password: '',
      apiKey: '',
      isActive: true,
      editingId: null,
    });
  };

  const handleError = (error: unknown, fallback: string) => {
    if (error instanceof Error) {
      setNotice({ type: 'error', message: error.message });
    } else {
      setNotice({ type: 'error', message: fallback });
    }
  };

  const loadEbayStatus = async () => {
    setEbayLoading(true);
    try {
      const status = await getEbayConnectionStatus();
      setEbayStatus(status);
    } catch (error) {
      console.error('Failed to load eBay status', error);
    } finally {
      setEbayLoading(false);
    }
  };

  const handleEbayConnect = async () => {
    try {
      const { url } = await getEbayAuthUrl();
      window.location.href = url;
    } catch (error) {
      setNotice({ type: 'error', message: 'Unable to start eBay OAuth flow.' });
    }
  };

  const handleEbayDisconnect = async () => {
    try {
      await disconnectEbay();
      setNotice({ type: 'success', message: 'eBay account disconnected.' });
      void loadEbayStatus();
    } catch (error) {
      setNotice({ type: 'error', message: 'Unable to disconnect eBay account.' });
    }
  };

  useEffect(() => {
    void loadEbayStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get('ebay_connected') === 'true') {
      setNotice({ type: 'success', message: 'eBay account connected successfully.' });
    } else if (params.get('ebay_error')) {
      setNotice({ type: 'error', message: 'Failed to connect to eBay. Please try again.' });
    }

    if (params.has('ebay_connected') || params.has('ebay_error')) {
      params.delete('ebay_connected');
      params.delete('ebay_error');
      setSearchParams(params, { replace: true });
    }
  }, [setSearchParams]);

  useEffect(() => {
    if (!ebayPolicies?.defaults || defaultsInitialized) {
      return;
    }
    setEbayDefaultsForm({
      categoryId: ebayPolicies.defaults.categoryId ?? '',
      paymentPolicyId: ebayPolicies.defaults.paymentPolicyId ?? '',
      fulfillmentPolicyId: ebayPolicies.defaults.fulfillmentPolicyId ?? '',
      returnPolicyId: ebayPolicies.defaults.returnPolicyId ?? '',
    });
    setDefaultsInitialized(true);
  }, [ebayPolicies?.defaults, defaultsInitialized]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Settings</p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Platform Credentials</h1>
              <p className="text-sm text-slate-500">
                Manage secure access to sourcing integrations and publishing channels. Sensitive fields are encrypted locally
                before persisting to the database.
              </p>
            </div>
          </div>
        </header>

        {notice ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              notice.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {notice.message}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-2">
          <CredentialsCard
            title="ShopGoodwill"
            description="Used for manifest ingestion and CSV sync. Credentials are encrypted with the backend key."
            lastSyncedAt={goodwillCredential?.lastSyncedAt}
            lastStatus={goodwillCredential?.lastSyncStatus}
            lastMessage={goodwillCredential?.lastSyncMessage}
            autoSyncEnabled={shopGoodwillForm.autoSyncEnabled}
            onToggleAutoSync={(value) => setShopGoodwillForm((prev) => ({ ...prev, autoSyncEnabled: value }))}
            onSubmit={(event) => {
              event.preventDefault();
              goodwillMutation.mutate();
            }}
            isSaving={goodwillMutation.isPending}
          >
            <label className="text-sm font-semibold text-slate-600">
              Username
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={shopGoodwillForm.username}
                onChange={(event) =>
                  setShopGoodwillForm((prev) => ({ ...prev, username: event.target.value }))
                }
                required
              />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Password
              <input
                type="password"
                placeholder={
                  goodwillCredential?.isConfigured ? 'Leave blank to keep existing password' : undefined
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={shopGoodwillForm.password}
                onChange={(event) =>
                  setShopGoodwillForm((prev) => ({ ...prev, password: event.target.value }))
                }
              />
            </label>
          </CredentialsCard>

          <CredentialsCard
            title="Salvation Army"
            description="Credentials are used for invoice downloads and auto-ingestion."
            lastSyncedAt={salvationCredential?.lastSyncedAt}
            lastStatus={salvationCredential?.lastSyncStatus}
            lastMessage={salvationCredential?.lastSyncMessage}
            autoSyncEnabled={salvationForm.autoSyncEnabled}
            onToggleAutoSync={(value) => setSalvationForm((prev) => ({ ...prev, autoSyncEnabled: value }))}
            onSubmit={(event) => {
              event.preventDefault();
              salvationMutation.mutate();
            }}
            isSaving={salvationMutation.isPending}
          >
            <label className="text-sm font-semibold text-slate-600">
              Username
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={salvationForm.username}
                onChange={(event) =>
                  setSalvationForm((prev) => ({ ...prev, username: event.target.value }))
                }
                required
              />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Password
              <input
                type="password"
                placeholder={
                  salvationCredential?.isConfigured ? 'Leave blank to keep existing password' : undefined
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={salvationForm.password}
                onChange={(event) =>
                  setSalvationForm((prev) => ({ ...prev, password: event.target.value }))
                }
              />
            </label>
          </CredentialsCard>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">eBay OAuth</p>
              <h2 className="text-xl font-semibold text-slate-900">Connect your eBay account</h2>
              <p className="text-sm text-slate-500">
                eBay requires OAuth (no stored password). Use the button below to begin the flow, then complete authorization
                on eBay. When finished you&apos;ll be redirected back to this page.
              </p>
            </div>
            <div className="text-sm text-slate-500">
              {ebayLoading ? (
                'Loading status…'
              ) : ebayStatus?.connected ? (
                <span className="text-emerald-600 font-semibold">Connected</span>
              ) : (
                <span className="text-slate-500 font-semibold">Not connected</span>
              )}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-2xl border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/10"
              onClick={handleEbayConnect}
              disabled={ebayLoading}
            >
              {ebayLoading ? 'Preparing…' : 'Connect eBay'}
            </button>
            <button
              type="button"
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-red-400 hover:text-red-500 disabled:opacity-60"
              onClick={handleEbayDisconnect}
              disabled={!ebayStatus?.connected}
            >
              Disconnect
            </button>
          </div>
          {ebayStatus?.connected ? (
            <>
              <div className="mt-4 space-y-1 text-xs text-slate-500">
                <p>Environment: {ebayStatus.environment ?? 'Sandbox'}</p>
                <p>
                  Access token expires:{' '}
                  {ebayStatus.tokenExpiresAt ? new Date(ebayStatus.tokenExpiresAt).toLocaleString() : '—'}
                </p>
                <p>
                  Refresh token expires:{' '}
                  {ebayStatus.refreshTokenExpiresAt
                    ? new Date(ebayStatus.refreshTokenExpiresAt).toLocaleString()
                    : '—'}
                </p>
                <p>User ID: {ebayStatus.ebayUserId ?? 'Pending'}</p>
              </div>
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Listing policies
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900">Default automation settings</h3>
                    <p className="text-xs text-slate-500">
                      These IDs prefill the listing composer and kit generator. Refresh to sync the latest values from
                      Seller Hub or paste a policy ID manually.
                    </p>
                  </div>
                  <div className="text-xs text-slate-500">
                    Last synced:{' '}
                    {policiesLoading || policiesFetching
                      ? 'Refreshing…'
                      : ebayPolicies?.lastSyncedAt
                        ? new Date(ebayPolicies.lastSyncedAt).toLocaleString()
                        : 'Never'}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand disabled:opacity-60"
                    onClick={() => refreshPoliciesMutation.mutate()}
                    disabled={
                      !ebayStatus.connected ||
                      policiesLoading ||
                      policiesFetching ||
                      refreshPoliciesMutation.isPending
                    }
                  >
                    {refreshPoliciesMutation.isPending || policiesFetching ? 'Refreshing…' : 'Refresh from eBay'}
                  </button>
                  <a
                    className="rounded-full border border-transparent px-3 py-1.5 text-xs font-semibold text-brand hover:text-brand-dark"
                    href={ebayDocsUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open Seller Hub
                  </a>
                </div>
                <form
                  className="mt-4 grid gap-3 md:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    updateEbayDefaultsMutation.mutate();
                  }}
                >
                  <label className="text-xs font-semibold text-slate-600">
                    Default category ID
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                      value={ebayDefaultsForm.categoryId}
                      onChange={(event) =>
                        setEbayDefaultsForm((prev) => ({
                          ...prev,
                          categoryId: event.target.value,
                        }))
                      }
                      placeholder="Optional override e.g. 9355"
                      autoComplete="off"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    Payment policy ID
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                      value={ebayDefaultsForm.paymentPolicyId}
                      onChange={(event) =>
                        setEbayDefaultsForm((prev) => ({
                          ...prev,
                          paymentPolicyId: event.target.value,
                        }))
                      }
                      list="ebay-payment-policy-options"
                      placeholder="Paste or select payment policy ID"
                      autoComplete="off"
                    />
                    <datalist id="ebay-payment-policy-options">
                      {(ebayPolicies?.paymentPolicies ?? []).map((policy) => (
                        <option key={policy.id} value={policy.policyId}>
                          {policyOptionLabel(policy)}
                        </option>
                      ))}
                    </datalist>
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    Fulfillment policy ID
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                      value={ebayDefaultsForm.fulfillmentPolicyId}
                      onChange={(event) =>
                        setEbayDefaultsForm((prev) => ({
                          ...prev,
                          fulfillmentPolicyId: event.target.value,
                        }))
                      }
                      list="ebay-fulfillment-policy-options"
                      placeholder="Paste or select fulfillment policy ID"
                      autoComplete="off"
                    />
                    <datalist id="ebay-fulfillment-policy-options">
                      {(ebayPolicies?.fulfillmentPolicies ?? []).map((policy) => (
                        <option key={policy.id} value={policy.policyId}>
                          {policyOptionLabel(policy)}
                        </option>
                      ))}
                    </datalist>
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    Return policy ID
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                      value={ebayDefaultsForm.returnPolicyId}
                      onChange={(event) =>
                        setEbayDefaultsForm((prev) => ({
                          ...prev,
                          returnPolicyId: event.target.value,
                        }))
                      }
                      list="ebay-return-policy-options"
                      placeholder="Optional — paste or select return policy ID"
                      autoComplete="off"
                    />
                    <datalist id="ebay-return-policy-options">
                      {(ebayPolicies?.returnPolicies ?? []).map((policy) => (
                        <option key={policy.id} value={policy.policyId}>
                          {policyOptionLabel(policy)}
                        </option>
                      ))}
                    </datalist>
                  </label>
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      className="rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-dark disabled:bg-slate-300"
                      disabled={updateEbayDefaultsMutation.isPending}
                    >
                      {updateEbayDefaultsMutation.isPending ? 'Saving…' : 'Save defaults'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Channels</p>
                <h2 className="text-xl font-semibold text-slate-900">Manual channel credentials</h2>
              </div>
              {generalForm.editingId ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-slate-500 underline"
                  onClick={resetGeneralForm}
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
            <form className="space-y-4" onSubmit={(event) => {
              event.preventDefault();
              generalMutation.mutate();
            }}>
              <label className="text-sm font-semibold text-slate-600">
                Platform
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={generalForm.platform}
                  onChange={(event) =>
                    setGeneralForm((prev) => ({
                      ...prev,
                      platform: event.target.value as GeneralPlatform,
                      username: '',
                      password: '',
                      apiKey: '',
                      accountName: '',
                      editingId: null,
                    }))
                  }
                >
                  {generalPlatforms.map((platform) => (
                    <option key={platform} value={platform}>
                      {generalPlatformConfigs[platform].label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-slate-500">{currentGeneralConfig.description}</p>

              {currentGeneralConfig.fields.includes('accountName') ? (
                <label className="text-sm font-semibold text-slate-600">
                  Account label
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={generalForm.accountName}
                    onChange={(event) =>
                      setGeneralForm((prev) => ({ ...prev, accountName: event.target.value }))
                    }
                    placeholder={currentGeneralConfig.accountPlaceholder ?? 'Internal nickname'}
                    required
                  />
                </label>
              ) : null}

              {currentGeneralConfig.fields.includes('username') ? (
                <label className="text-sm font-semibold text-slate-600">
                  Login username / email
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={generalForm.username}
                    onChange={(event) =>
                      setGeneralForm((prev) => ({ ...prev, username: event.target.value }))
                    }
                    required
                  />
                </label>
              ) : null}

              {currentGeneralConfig.fields.includes('password') ? (
                <label className="text-sm font-semibold text-slate-600">
                  Password
                  <input
                    type="password"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={generalForm.password}
                    onChange={(event) =>
                      setGeneralForm((prev) => ({ ...prev, password: event.target.value }))
                    }
                    placeholder={generalForm.editingId ? 'Leave blank to keep existing password' : undefined}
                    required={!generalForm.editingId}
                  />
                </label>
              ) : null}

              {currentGeneralConfig.fields.includes('apiKey') ? (
                <label className="text-sm font-semibold text-slate-600">
                  API key / token
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={generalForm.apiKey}
                    onChange={(event) =>
                      setGeneralForm((prev) => ({ ...prev, apiKey: event.target.value }))
                    }
                    required
                  />
                </label>
              ) : null}

              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={generalForm.isActive}
                  onChange={(event) =>
                    setGeneralForm((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                />
                Active
              </label>

              <button
                type="submit"
                className="w-full rounded-2xl bg-brand py-3 text-sm font-semibold text-white disabled:opacity-60"
                disabled={generalMutation.isPending}
              >
                {generalMutation.isPending ? 'Saving…' : generalForm.editingId ? 'Update credential' : 'Save credential'}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-dashed border-amber-400 bg-amber-50/80 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-amber-900">eBay OAuth</h3>
            <p className="mt-2 text-sm text-amber-900/80">
              eBay requires OAuth. We&apos;re finalizing the adapter—meanwhile, provision keys in their developer portal and
              drop them into <code>appsettings</code> or Vault. You can review the legacy instructions in the previous project&apos;s
              Marketplaces page.
            </p>
            <a
              href={ebayDocsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center justify-center rounded-full border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
            >
              Visit eBay developer portal
            </a>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Inventory</p>
              <h2 className="text-xl font-semibold text-slate-900">Stored credentials</h2>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {platformCredentials.length} total
            </span>
          </div>
          <div className="space-y-3">
            {!platformCredentials.length ? (
              <p className="text-sm text-slate-500">Add a credential using the form above to see it here.</p>
            ) : null}
            {platformCredentials.map((credential) => (
              <div
                key={credential.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {credential.accountName || credential.platform.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-slate-500">
                      {credential.metadata && typeof credential.metadata.username === 'string'
                        ? credential.metadata.username
                        : 'Username pending'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-semibold uppercase tracking-wide ${
                        credential.isActive ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {credential.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      type="button"
                      className="text-xs font-semibold text-brand underline"
                      onClick={() => handleEditGeneral(credential)}
                      disabled={
                        !generalPlatforms.includes(credential.platform as GeneralPlatform)
                      }
                    >
                      Edit
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Platform: {credential.platform.replace('_', ' ')} · Last verified:{' '}
                  {credential.lastVerifiedAt
                    ? new Date(credential.lastVerifiedAt).toLocaleString()
                    : 'Pending'}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

interface CredentialsCardProps {
  title: string;
  description: string;
  children: ReactNode;
  lastSyncedAt?: string | null;
  lastStatus?: string | null;
  lastMessage?: string | null;
  autoSyncEnabled: boolean;
  onToggleAutoSync: (value: boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isSaving: boolean;
}

const CredentialsCard = ({
  title,
  description,
  children,
  lastSyncedAt,
  lastStatus,
  lastMessage,
  autoSyncEnabled,
  onToggleAutoSync,
  onSubmit,
  isSaving,
}: CredentialsCardProps) => (
  <form className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={onSubmit}>
    <div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
    {children}
    <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
      <input type="checkbox" checked={autoSyncEnabled} onChange={(event) => onToggleAutoSync(event.target.checked)} />
      Enable daily sync
    </label>
    <button
      type="submit"
      className="w-full rounded-2xl bg-brand py-3 text-sm font-semibold text-white disabled:opacity-60"
      disabled={isSaving}
    >
      {isSaving ? 'Saving…' : 'Save credential'}
    </button>
    <div className="text-xs text-slate-500">
      <p>Last sync: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never'}</p>
      <p>Status: {lastStatus ?? 'Pending'}</p>
      {lastMessage ? <p>Message: {lastMessage}</p> : null}
    </div>
  </form>
);
