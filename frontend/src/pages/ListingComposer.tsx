import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { usePurchases } from '../hooks/usePurchases';
import { useListingTemplates } from '../hooks/useListingTemplates';
import { usePlatformCredentials } from '../hooks/usePlatformCredentials';
import { useEbayPolicies } from '../hooks/useEbayPolicies';
import { apiClient } from '../lib/api-client';
import type { ListingCondition, ListingPlatform, ListingStatus } from '../types/listing';
import type { EbaySellerPolicy } from '../types/ebay';
import { AppLayout } from '../components/AppLayout';

const conditionOptions: ListingCondition[] = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR', 'UNKNOWN'];
const platformOptions: ListingPlatform[] = ['EBAY', 'FACEBOOK_MARKETPLACE', 'OFFERUP', 'POSHMARK', 'MERCARI', 'SHOPGOODWILL', 'OTHER'];
const currencyOptions = ['USD', 'CAD', 'EUR', 'GBP'];

const policyOptionLabel = (policy: EbaySellerPolicy) =>
  `${policy.name}${policy.isDefault ? ' (Default)' : ''} · ${policy.policyId}`;

interface ListingFormState {
  platform: ListingPlatform;
  condition: ListingCondition;
  title: string;
  description: string;
  askingPrice: string;
  minPrice: string;
  shippingPrice: string;
  feesEstimate: string;
  quantity: number;
  purchaseItemId: string;
  category: string;
  tags: string;
  sku: string;
  currency: string;
  accountId: string;
  platformCredentialId: string;
  location: string;
  serialNumber: string;
  weightLbs: string;
  dimensionLength: string;
  dimensionWidth: string;
  dimensionHeight: string;
  dimensionUnit: string;
  platformSettings: string;
  ebayCategoryId: string;
  ebayPaymentPolicyId: string;
  ebayFulfillmentPolicyId: string;
  ebayReturnPolicyId: string;
}

const defaultForm: ListingFormState = {
  platform: 'EBAY',
  condition: 'UNKNOWN',
  title: '',
  description: '',
  askingPrice: '',
  minPrice: '',
  shippingPrice: '',
  feesEstimate: '',
  quantity: 1,
  purchaseItemId: '',
  category: '',
  tags: '',
  sku: '',
  currency: 'USD',
  accountId: '',
  platformCredentialId: '',
  location: '',
  serialNumber: '',
  weightLbs: '',
  dimensionLength: '',
  dimensionWidth: '',
  dimensionHeight: '',
  dimensionUnit: 'in',
  platformSettings: '',
  ebayCategoryId: '',
  ebayPaymentPolicyId: '',
  ebayFulfillmentPolicyId: '',
  ebayReturnPolicyId: '',
};

export const ListingComposer = () => {
  const { data: purchasesData } = usePurchases();
  const { data: templates } = useListingTemplates();
  const { data: credentialData } = usePlatformCredentials();
  const purchases = purchasesData?.data ?? [];
  const credentials = credentialData ?? [];

  const [form, setForm] = useState<ListingFormState>({ ...defaultForm });
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const { data: ebayPolicies } = useEbayPolicies(form.platform === 'EBAY');
  const ebayDefaults = ebayPolicies?.defaults;
  const paymentPolicyOptions = ebayPolicies?.paymentPolicies ?? [];
  const fulfillmentPolicyOptions = ebayPolicies?.fulfillmentPolicies ?? [];
  const returnPolicyOptions = ebayPolicies?.returnPolicies ?? [];

  const createListing = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.post('/listings', payload);
      return data;
    },
    onSuccess: () => {
      setForm({ ...defaultForm });
    },
  });

  useEffect(() => {
    if (!templates?.length || form.title) return;
    const template = templates[0];
    if (template.defaultData?.title) {
      setForm((prev) => ({
        ...prev,
        title: String(template.defaultData.title),
        description: String(template.defaultData.description ?? ''),
      }));
    }
    const templateSettings = template.defaultData?.platformSettings as Record<string, unknown> | undefined;
    if (templateSettings && typeof templateSettings === 'object') {
      setForm((prev) => ({
        ...prev,
        ebayCategoryId: typeof templateSettings.categoryId === 'string' ? templateSettings.categoryId : prev.ebayCategoryId,
        ebayPaymentPolicyId:
          typeof templateSettings.paymentPolicyId === 'string'
            ? templateSettings.paymentPolicyId
            : prev.ebayPaymentPolicyId,
        ebayFulfillmentPolicyId:
          typeof templateSettings.fulfillmentPolicyId === 'string'
            ? templateSettings.fulfillmentPolicyId
            : prev.ebayFulfillmentPolicyId,
        ebayReturnPolicyId:
          typeof templateSettings.returnPolicyId === 'string'
            ? templateSettings.returnPolicyId
            : prev.ebayReturnPolicyId,
      }));
    }
  }, [templates, form.title]);

  useEffect(() => {
    if (form.platform !== 'EBAY' || !ebayPolicies?.defaults) {
      return;
    }
    setForm((prev) => {
      const updates: Partial<ListingFormState> = {};
      if (!prev.ebayCategoryId && ebayPolicies.defaults.categoryId) {
        updates.ebayCategoryId = ebayPolicies.defaults.categoryId;
      }
      if (!prev.ebayPaymentPolicyId && ebayPolicies.defaults.paymentPolicyId) {
        updates.ebayPaymentPolicyId = ebayPolicies.defaults.paymentPolicyId;
      }
      if (!prev.ebayFulfillmentPolicyId && ebayPolicies.defaults.fulfillmentPolicyId) {
        updates.ebayFulfillmentPolicyId = ebayPolicies.defaults.fulfillmentPolicyId;
      }
      if (!prev.ebayReturnPolicyId && ebayPolicies.defaults.returnPolicyId) {
        updates.ebayReturnPolicyId = ebayPolicies.defaults.returnPolicyId;
      }
      if (Object.keys(updates).length === 0) {
        return prev;
      }
      return {
        ...prev,
        ...updates,
      };
    });
  }, [form.platform, ebayPolicies?.defaults]);

  const purchaseOptions = useMemo(
    () =>
      purchases.flatMap((purchase) =>
        purchase.items.map((item) => ({
          id: item.id,
          label: `${purchase.orderNumber ?? 'Batch'} · ${item.title}`,
        })),
      ),
    [purchases],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let platformSettings: Record<string, unknown> | undefined;
    if (form.platformSettings.trim()) {
      try {
        platformSettings = JSON.parse(form.platformSettings);
        setSettingsError(null);
      } catch (error) {
        console.error(error);
        setSettingsError('Platform overrides must be valid JSON');
        return;
      }
    } else {
      setSettingsError(null);
    }

    const dimensions =
      form.dimensionLength || form.dimensionWidth || form.dimensionHeight
        ? {
            length: form.dimensionLength ? parseFloat(form.dimensionLength) : undefined,
            width: form.dimensionWidth ? parseFloat(form.dimensionWidth) : undefined,
            height: form.dimensionHeight ? parseFloat(form.dimensionHeight) : undefined,
            unit: form.dimensionUnit,
          }
        : undefined;

    const tags = form.tags
      ? form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];

    if (form.platform === 'EBAY') {
      const ebaySettings: Record<string, string> = {};
      if (form.ebayCategoryId.trim()) {
        ebaySettings.categoryId = form.ebayCategoryId.trim();
      }
      if (form.ebayPaymentPolicyId.trim()) {
        ebaySettings.paymentPolicyId = form.ebayPaymentPolicyId.trim();
      }
      if (form.ebayFulfillmentPolicyId.trim()) {
        ebaySettings.fulfillmentPolicyId = form.ebayFulfillmentPolicyId.trim();
      }
      if (form.ebayReturnPolicyId.trim()) {
        ebaySettings.returnPolicyId = form.ebayReturnPolicyId.trim();
      }
      if (Object.keys(ebaySettings).length) {
        platformSettings = {
          ...(platformSettings ?? {}),
          ...ebaySettings,
        };
      }
    }

    if (platformSettings && !Object.keys(platformSettings).length) {
      platformSettings = undefined;
    }

    const payload = {
      platform: form.platform,
      title: form.title,
      description: form.description,
      askingPrice: parseFloat(form.askingPrice),
      minPrice: form.minPrice ? parseFloat(form.minPrice) : undefined,
      shippingPrice: form.shippingPrice ? parseFloat(form.shippingPrice) : undefined,
      feesEstimate: form.feesEstimate ? parseFloat(form.feesEstimate) : undefined,
      currency: form.currency,
      quantity: form.quantity,
      purchaseItemId: form.purchaseItemId || undefined,
      condition: form.condition,
      category: form.category || undefined,
      tags,
      sku: form.sku || undefined,
      accountId: form.accountId || undefined,
      platformCredentialId: form.platformCredentialId || undefined,
      location: form.location || undefined,
      serialNumber: form.serialNumber || undefined,
      weightLbs: form.weightLbs ? parseFloat(form.weightLbs) : undefined,
      dimensions,
      platformSettings,
      status: 'DRAFT' as ListingStatus,
    };

    createListing.mutate(payload);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Listings</p>
        <h1 className="text-2xl font-semibold text-slate-900">Composer</h1>
        <p className="text-sm text-slate-500">Capture canonical details once, then reuse across marketplaces.</p>
      </div>

      <form className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-600">
            Platform
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.platform}
              onChange={(event) => setForm((prev) => ({ ...prev, platform: event.target.value as ListingPlatform }))}
            >
              {platformOptions.map((platform) => (
                <option key={platform} value={platform}>
                  {platform.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-600">
            Platform credential
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.platformCredentialId}
              onChange={(event) => setForm((prev) => ({ ...prev, platformCredentialId: event.target.value }))}
            >
              <option value="">Unassigned</option>
              {credentials.map((credential) => (
                <option key={credential.id} value={credential.id}>
                  {credential.accountName} · {credential.platform}
                </option>
              ))}
            </select>
            {!credentials.length ? (
              <span className="mt-1 block text-xs text-slate-400">
                Add credentials first in{' '}
                <Link className="text-brand underline" to="/settings/platform-credentials">
                  Settings → Platform Credentials
                </Link>
                .
              </span>
            ) : null}
          </label>
        </div>

        {form.platform === 'EBAY' ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
            <p className="text-sm font-semibold text-amber-900">eBay policies</p>
            <p className="mb-3 text-xs text-amber-800">
              Provide policy IDs from eBay Seller Hub. These override template defaults and are included in the listing kit.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold text-amber-900">
                Category ID
                <input
                  className="mt-1 w-full rounded-xl border border-amber-200 px-3 py-2 text-xs"
                  value={form.ebayCategoryId}
                  onChange={(event) => setForm((prev) => ({ ...prev, ebayCategoryId: event.target.value }))}
                  placeholder={ebayDefaults?.categoryId ? `Default: ${ebayDefaults.categoryId}` : 'e.g. 9355'}
                  autoComplete="off"
                />
              </label>
              <label className="text-xs font-semibold text-amber-900">
                Payment policy ID
                <input
                  className="mt-1 w-full rounded-xl border border-amber-200 px-3 py-2 text-xs"
                  value={form.ebayPaymentPolicyId}
                  onChange={(event) => setForm((prev) => ({ ...prev, ebayPaymentPolicyId: event.target.value }))}
                  placeholder={
                    ebayDefaults?.paymentPolicyId ? `Default: ${ebayDefaults.paymentPolicyId}` : 'e.g. 1234567890'
                  }
                  list="composer-ebay-payment-policies"
                  autoComplete="off"
                />
              </label>
              <datalist id="composer-ebay-payment-policies">
                {paymentPolicyOptions.map((policy) => (
                  <option key={policy.id} value={policy.policyId}>
                    {policyOptionLabel(policy)}
                  </option>
                ))}
              </datalist>
              <label className="text-xs font-semibold text-amber-900">
                Fulfillment policy ID
                <input
                  className="mt-1 w-full rounded-xl border border-amber-200 px-3 py-2 text-xs"
                  value={form.ebayFulfillmentPolicyId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, ebayFulfillmentPolicyId: event.target.value }))
                  }
                  placeholder={
                    ebayDefaults?.fulfillmentPolicyId
                      ? `Default: ${ebayDefaults.fulfillmentPolicyId}`
                      : 'e.g. 0987654321'
                  }
                  list="composer-ebay-fulfillment-policies"
                  autoComplete="off"
                />
              </label>
              <datalist id="composer-ebay-fulfillment-policies">
                {fulfillmentPolicyOptions.map((policy) => (
                  <option key={policy.id} value={policy.policyId}>
                    {policyOptionLabel(policy)}
                  </option>
                ))}
              </datalist>
              <label className="text-xs font-semibold text-amber-900">
                Return policy ID
                <input
                  className="mt-1 w-full rounded-xl border border-amber-200 px-3 py-2 text-xs"
                  value={form.ebayReturnPolicyId}
                  onChange={(event) => setForm((prev) => ({ ...prev, ebayReturnPolicyId: event.target.value }))}
                  placeholder={
                    ebayDefaults?.returnPolicyId ? `Default: ${ebayDefaults.returnPolicyId}` : 'Optional'
                  }
                  list="composer-ebay-return-policies"
                  autoComplete="off"
                />
              </label>
              <datalist id="composer-ebay-return-policies">
                {returnPolicyOptions.map((policy) => (
                  <option key={policy.id} value={policy.policyId}>
                    {policyOptionLabel(policy)}
                  </option>
                ))}
              </datalist>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-600">
            Condition
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.condition}
              onChange={(event) => setForm((prev) => ({ ...prev, condition: event.target.value as ListingCondition }))}
            >
              {conditionOptions.map((condition) => (
                <option key={condition} value={condition}>
                  {condition.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-600">
            Currency
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.currency}
              onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}
            >
              {currencyOptions.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-600">
            SKU / Listing code
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.sku}
              onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
            />
          </label>

          <label className="text-sm font-semibold text-slate-600">
            Account reference
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.accountId}
              onChange={(event) => setForm((prev) => ({ ...prev, accountId: event.target.value }))}
              placeholder="e.g. main-ebay"
            />
          </label>
        </div>

        <label className="text-sm font-semibold text-slate-600">
          Title
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />
        </label>

        <label className="text-sm font-semibold text-slate-600">
          Description
          <textarea
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            rows={4}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-600">
            Price ({form.currency})
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.askingPrice}
              onChange={(event) => setForm((prev) => ({ ...prev, askingPrice: event.target.value }))}
              required
            />
          </label>

          <label className="text-sm font-semibold text-slate-600">
            Minimum price
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.minPrice}
              onChange={(event) => setForm((prev) => ({ ...prev, minPrice: event.target.value }))}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-600">
            Shipping price
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.shippingPrice}
              onChange={(event) => setForm((prev) => ({ ...prev, shippingPrice: event.target.value }))}
            />
          </label>

          <label className="text-sm font-semibold text-slate-600">
            Fees estimate
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.feesEstimate}
              onChange={(event) => setForm((prev) => ({ ...prev, feesEstimate: event.target.value }))}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-600">
            Quantity
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.quantity}
              onChange={(event) => setForm((prev) => ({ ...prev, quantity: Number(event.target.value) }))}
            />
          </label>

          <label className="text-sm font-semibold text-slate-600">
            Category
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-600">
            Inventory line
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.purchaseItemId}
              onChange={(event) => setForm((prev) => ({ ...prev, purchaseItemId: event.target.value }))}
            >
              <option value="">Unlinked</option>
              {purchaseOptions.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-600">
            Tags (comma separated)
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.tags}
              onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-600">
            Storage location
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.location}
              onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
            />
          </label>

          <label className="text-sm font-semibold text-slate-600">
            Serial / IMEI
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.serialNumber}
              onChange={(event) => setForm((prev) => ({ ...prev, serialNumber: event.target.value }))}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-600">
            Weight (lbs)
            <input
              type="number"
              step="0.1"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.weightLbs}
              onChange={(event) => setForm((prev) => ({ ...prev, weightLbs: event.target.value }))}
            />
          </label>

          <div>
            <label className="text-sm font-semibold text-slate-600">Dimensions</label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              <input
                type="number"
                step="0.1"
                placeholder="L"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.dimensionLength}
                onChange={(event) => setForm((prev) => ({ ...prev, dimensionLength: event.target.value }))}
              />
              <input
                type="number"
                step="0.1"
                placeholder="W"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.dimensionWidth}
                onChange={(event) => setForm((prev) => ({ ...prev, dimensionWidth: event.target.value }))}
              />
              <input
                type="number"
                step="0.1"
                placeholder="H"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.dimensionHeight}
                onChange={(event) => setForm((prev) => ({ ...prev, dimensionHeight: event.target.value }))}
              />
            </div>
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.dimensionUnit}
              onChange={(event) => setForm((prev) => ({ ...prev, dimensionUnit: event.target.value }))}
            >
              <option value="in">Inches</option>
              <option value="cm">Centimeters</option>
            </select>
          </div>
        </div>

        <label className="text-sm font-semibold text-slate-600">
          Platform overrides (JSON)
          <textarea
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder='{"ebay": {"categoryId": "123"}}'
            rows={4}
            value={form.platformSettings}
            onChange={(event) => setForm((prev) => ({ ...prev, platformSettings: event.target.value }))}
          />
          {settingsError ? <span className="text-xs text-red-500">{settingsError}</span> : null}
        </label>

        <button
          className="w-full rounded-2xl bg-brand py-3 text-sm font-semibold text-white disabled:opacity-60"
          type="submit"
          disabled={createListing.isPending}
        >
          {createListing.isPending ? 'Saving…' : 'Save draft listing'}
        </button>

        {createListing.isError ? (
          <p className="text-sm text-red-500">Failed to save listing. Please review required fields.</p>
        ) : null}
        {createListing.isSuccess ? (
          <p className="text-sm text-emerald-600">Listing saved. Ready for marketplace publishing.</p>
        ) : null}
      </form>
      </div>
    </AppLayout>
  );
};
