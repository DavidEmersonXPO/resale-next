import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePurchases } from '../hooks/usePurchases';
import { apiClient } from '../lib/api-client';
import { formatCurrency } from '../utils/formatters';
import type { Purchase } from '../types/purchase';
import { AppLayout } from '../components/AppLayout';

type InventoryStatus =
  | 'INBOUND'
  | 'IN_STOCK'
  | 'LISTED'
  | 'RESERVED'
  | 'SOLD'
  | 'DONATED';

type PurchaseSource =
  | 'EBAY'
  | 'GOODWILL'
  | 'SALVATION_ARMY'
  | 'FACEBOOK_MARKETPLACE'
  | 'OFFERUP'
  | 'OTHER';

const purchaseSourceOptions: PurchaseSource[] = [
  'EBAY',
  'GOODWILL',
  'SALVATION_ARMY',
  'FACEBOOK_MARKETPLACE',
  'OFFERUP',
  'OTHER',
];

const inventoryStatuses: InventoryStatus[] = [
  'INBOUND',
  'IN_STOCK',
  'LISTED',
  'RESERVED',
  'SOLD',
  'DONATED',
];

interface PurchaseFormState {
  orderNumber: string;
  source: PurchaseSource;
  purchaseDate: string;
  totalCost: string;
  shippingCost: string;
  fees: string;
  status: InventoryStatus;
  notes: string;
}

interface PurchaseItemFormState {
  title: string;
  description: string;
  quantity: string;
  unitCost: string;
  inventoryStatus: InventoryStatus;
  location: string;
  sku: string;
}

const createDefaultPurchaseForm = (): PurchaseFormState => ({
  orderNumber: '',
  source: 'GOODWILL',
  purchaseDate: new Date().toISOString().split('T')[0],
  totalCost: '',
  shippingCost: '',
  fees: '',
  status: 'IN_STOCK',
  notes: '',
});

const defaultItem = (): PurchaseItemFormState => ({
  title: '',
  description: '',
  quantity: '1',
  unitCost: '',
  inventoryStatus: 'IN_STOCK',
  location: '',
  sku: '',
});

export const PurchasesPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const purchasesQuery = usePurchases({
    limit: 50,
    search: searchTerm ? searchTerm : undefined,
  });
  const purchases = purchasesQuery.data?.data ?? [];

  const [formState, setFormState] = useState<PurchaseFormState>(() => createDefaultPurchaseForm());
  const [items, setItems] = useState<PurchaseItemFormState[]>([defaultItem()]);
  const [formError, setFormError] = useState<string | null>(null);

  const createPurchase = useMutation({
    mutationFn: async () => {
      const payload = {
        orderNumber: formState.orderNumber || undefined,
        source: formState.source,
        purchaseDate: formState.purchaseDate,
        totalCost: Number(formState.totalCost) || 0,
        shippingCost: formState.shippingCost ? Number(formState.shippingCost) : undefined,
        fees: formState.fees ? Number(formState.fees) : undefined,
        status: formState.status,
        notes: formState.notes || undefined,
        items: items.map((item) => ({
          title: item.title.trim(),
          description: item.description || undefined,
          quantity: item.quantity ? Number(item.quantity) : 1,
          unitCost: item.unitCost ? Number(item.unitCost) : 0,
          inventoryStatus: item.inventoryStatus,
          location: item.location || undefined,
          sku: item.sku || undefined,
        })),
      };
      const { data } = await apiClient.post('/purchases', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      setFormState(createDefaultPurchaseForm());
      setItems([defaultItem()]);
      setFormError(null);
    },
  });

  const summary = useMemo(() => {
    if (!purchases.length) {
      return { spend: 0, lines: 0 };
    }
    const spend = purchases.reduce((acc, purchase) => acc + parseFloat(purchase.totalCost ?? '0'), 0);
    const lines = purchases.reduce((acc, purchase) => acc + purchase.items.length, 0);
    return { spend, lines };
  }, [purchases]);

  const handleItemChange = (index: number, field: keyof PurchaseItemFormState, value: string) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    );
  };

  const addItemRow = () => setItems((prev) => [...prev, defaultItem()]);
  const removeItemRow = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.totalCost) {
      setFormError('Total cost is required.');
      return;
    }
    if (!items.every((item) => item.title.trim())) {
      setFormError('Each item needs a title.');
      return;
    }
    setFormError(null);
    createPurchase.mutate();
  };

  return (
    <AppLayout>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Purchasing</p>
          <h1 className="text-2xl font-semibold text-slate-900">Purchasing Workspace</h1>
          <p className="text-sm text-slate-500">
            Intake inventory lots, capture item detail, and keep sourcing synced with listings.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/listings/new"
            className="flex items-center gap-2 rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/10"
          >
            Listing Composer
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand"
          >
            Dashboard
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Intake form
              </p>
              <h2 className="text-xl font-semibold text-slate-900">Capture new purchase</h2>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>Total tracked spend: {formatCurrency(summary.spend)}</p>
              <p>Inventory lines: {summary.lines}</p>
            </div>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm font-semibold text-slate-600">
                Source
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={formState.source}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, source: event.target.value as PurchaseSource }))
                  }
                >
                  {purchaseSourceOptions.map((source) => (
                    <option key={source} value={source}>
                      {source.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-600">
                Purchase date
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={formState.purchaseDate}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, purchaseDate: event.target.value }))
                  }
                  required
                />
              </label>

              <label className="text-sm font-semibold text-slate-600">
                Order / manifest #
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={formState.orderNumber}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, orderNumber: event.target.value }))
                  }
                  placeholder="e.g., GW-12345"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm font-semibold text-slate-600">
                Total cost
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={formState.totalCost}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, totalCost: event.target.value }))
                  }
                  required
                />
              </label>

              <label className="text-sm font-semibold text-slate-600">
                Shipping cost
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={formState.shippingCost}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, shippingCost: event.target.value }))
                  }
                />
              </label>

              <label className="text-sm font-semibold text-slate-600">
                Fees
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={formState.fees}
                  onChange={(event) => setFormState((prev) => ({ ...prev, fees: event.target.value }))}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-slate-600">
                Purchase status
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={formState.status}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, status: event.target.value as InventoryStatus }))
                  }
                >
                  {inventoryStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-600">
                Notes
                <textarea
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  rows={2}
                  value={formState.notes}
                  onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Batch condition, manifest URL, pickup details…"
                />
              </label>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Line items
                  </p>
                  <h3 className="text-base font-semibold text-slate-900">Inventory lines</h3>
                </div>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-brand hover:text-brand"
                >
                  Add item
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={`item-${index}`}
                    className="rounded-2xl border border-slate-200 p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-600">Item #{index + 1}</p>
                      {items.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          className="text-xs font-semibold text-red-500"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-sm font-semibold text-slate-600">
                        Title
                        <input
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          value={item.title}
                          onChange={(event) => handleItemChange(index, 'title', event.target.value)}
                          required
                        />
                      </label>

                      <label className="text-sm font-semibold text-slate-600">
                        SKU
                        <input
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          value={item.sku}
                          onChange={(event) => handleItemChange(index, 'sku', event.target.value)}
                          placeholder="Optional"
                        />
                      </label>
                    </div>

                    <label className="mt-3 block text-sm font-semibold text-slate-600">
                      Description
                      <textarea
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        rows={2}
                        value={item.description}
                        onChange={(event) => handleItemChange(index, 'description', event.target.value)}
                      />
                    </label>

                    <div className="mt-3 grid gap-4 md:grid-cols-4">
                      <label className="text-sm font-semibold text-slate-600">
                        Quantity
                        <input
                          type="number"
                          min={1}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          value={item.quantity}
                          onChange={(event) => handleItemChange(index, 'quantity', event.target.value)}
                        />
                      </label>
                      <label className="text-sm font-semibold text-slate-600">
                        Unit cost
                        <input
                          type="number"
                          step="0.01"
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          value={item.unitCost}
                          onChange={(event) => handleItemChange(index, 'unitCost', event.target.value)}
                        />
                      </label>
                      <label className="text-sm font-semibold text-slate-600">
                        Inventory status
                        <select
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          value={item.inventoryStatus}
                          onChange={(event) =>
                            handleItemChange(index, 'inventoryStatus', event.target.value)
                          }
                        >
                          {inventoryStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-semibold text-slate-600">
                        Location / bin
                        <input
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          value={item.location}
                          onChange={(event) => handleItemChange(index, 'location', event.target.value)}
                          placeholder="Shelf, tote, etc."
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

            <button
              type="submit"
              className="w-full rounded-2xl bg-brand py-3 text-sm font-semibold text-white disabled:opacity-60"
              disabled={createPurchase.isPending}
            >
              {createPurchase.isPending ? 'Saving…' : 'Save purchase'}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                History
              </p>
              <h2 className="text-xl font-semibold text-slate-900">Recent purchases</h2>
            </div>
            <input
              placeholder="Search by manifest or item title"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm md:max-w-sm"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          {purchasesQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading purchases…</p>
          ) : !purchases.length ? (
            <p className="text-sm text-slate-500">No purchases recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {purchases.map((purchase) => (
                <PurchaseCard key={purchase.id} purchase={purchase} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
};

const PurchaseCard = ({ purchase }: { purchase: Purchase }) => {
  const itemValue = purchase.items.reduce(
    (acc, item) => acc + parseFloat(item.unitCost || '0') * (item.quantity ?? 1),
    0,
  );
  return (
    <div className="rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {purchase.source.replace('_', ' ')}
          </p>
          <p className="text-lg font-semibold text-slate-900">
            {purchase.orderNumber ?? 'Unlabeled manifest'}
          </p>
          <p className="text-xs text-slate-500">
            {new Date(purchase.purchaseDate).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-900">
            {formatCurrency(purchase.totalCost, 'USD')}
          </p>
          <p className="text-xs text-slate-500">{purchase.items.length} inventory lines</p>
          <p className="text-xs text-slate-500">
            Item value tracked: {formatCurrency(itemValue, 'USD')}
          </p>
        </div>
      </div>
      {purchase.notes ? (
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-semibold text-slate-500">Notes:</span> {purchase.notes}
        </p>
      ) : null}
      <div className="mt-4 space-y-3">
        {purchase.items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold">{item.title}</p>
              <p className="text-xs uppercase tracking-wide text-slate-400">{item.inventoryStatus}</p>
            </div>
            <p className="text-xs text-slate-500">
              Qty {item.quantity} • {formatCurrency(item.unitCost || '0', 'USD')} each
            </p>
            {item.sku ? <p className="text-xs text-slate-500">SKU: {item.sku}</p> : null}
            {item.location ? (
              <p className="text-xs text-slate-500">Location: {item.location}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};
