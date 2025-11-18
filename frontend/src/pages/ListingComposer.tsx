import { useEffect, useMemo, useState } from 'react';
import { usePurchases } from '../hooks/usePurchases';
import { useListingTemplates } from '../hooks/useListingTemplates';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

type Condition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'UNKNOWN';
type ListingPlatform = 'EBAY' | 'FACEBOOK_MARKETPLACE' | 'OFFERUP' | 'POSHMARK' | 'MERCARI' | 'SHOPGOODWILL' | 'OTHER';
type ListingStatus = 'DRAFT' | 'ACTIVE' | 'PENDING' | 'SOLD' | 'ARCHIVED';

const conditionOptions: Condition[] = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR', 'UNKNOWN'];
const platformOptions: ListingPlatform[] = [
  'EBAY',
  'FACEBOOK_MARKETPLACE',
  'OFFERUP',
  'POSHMARK',
  'MERCARI',
  'SHOPGOODWILL',
  'OTHER',
];

export const ListingComposer = () => {
  const { data: purchasesData } = usePurchases();
  const { data: templates } = useListingTemplates();
  const purchases = purchasesData?.data ?? [];

  const [form, setForm] = useState({
    platform: 'EBAY' as ListingPlatform,
    title: '',
    description: '',
    askingPrice: '',
    quantity: 1,
    purchaseItemId: '',
    condition: 'UNKNOWN' as Condition,
    category: '',
    tags: '',
  });

  const createListing = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        askingPrice: parseFloat(form.askingPrice),
        tags: form.tags ? form.tags.split(',').map((tag) => tag.trim()) : [],
        status: 'DRAFT' as ListingStatus,
      };
      const { data } = await apiClient.post('/listings', payload);
      return data;
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
  }, [templates, form.title]);

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
    createListing.mutate();
  };

  return (
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
              onChange={(event) => setForm({ ...form, platform: event.target.value as ListingPlatform })}
            >
              {platformOptions.map((platform) => (
                <option key={platform} value={platform}>
                  {platform.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-600">
            Condition
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.condition}
              onChange={(event) => setForm({ ...form, condition: event.target.value as Condition })}
            >
              {conditionOptions.map((condition) => (
                <option key={condition} value={condition}>
                  {condition.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="text-sm font-semibold text-slate-600">
          Title
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            required
          />
        </label>

        <label className="text-sm font-semibold text-slate-600">
          Description
          <textarea
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            rows={4}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-600">
            Price (USD)
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.askingPrice}
              onChange={(event) => setForm({ ...form, askingPrice: event.target.value })}
              required
            />
          </label>

          <label className="text-sm font-semibold text-slate-600">
            Category
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-600">
            Inventory line
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.purchaseItemId}
              onChange={(event) => setForm({ ...form, purchaseItemId: event.target.value })}
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
              onChange={(event) => setForm({ ...form, tags: event.target.value })}
            />
          </label>
        </div>

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
  );
};
