import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PurchasesTable } from '../components/PurchasesTable';
import { StatCard } from '../components/StatCard';
import { usePurchases } from '../hooks/usePurchases';
import { useListings } from '../hooks/useListings';
import { useIntegrationTrigger } from '../hooks/useIntegrationTrigger';
import { formatCurrency } from '../utils/formatters';
import { authStore } from '../stores/auth-store';
import { LogOut, RefreshCw } from 'lucide-react';
import { MediaUploadPanel } from '../components/MediaUploadPanel';

const quickActions = [
  {
    label: 'Sync Goodwill manifest',
    path: '/integrations/goodwill/manifests',
    payload: {
      manifestId: 'DRAFT',
      purchaseDate: new Date().toISOString(),
      totalCost: 0,
      items: [],
    },
  },
  {
    label: 'Sync Salvation Army invoice',
    path: '/integrations/salvation-army/invoices',
    payload: {
      invoiceNumber: 'DRAFT',
      invoiceDate: new Date().toISOString(),
      total: 0,
      items: [],
    },
  },
];

export const DashboardPage = () => {
  const { data: purchaseData, isLoading: purchasesLoading } = usePurchases();
  const { data: listingData } = useListings();
  const integrationMutation = useIntegrationTrigger();
  const purchases = purchaseData?.data ?? [];
  const listings = listingData?.data ?? [];

  const { spend, avgLineCost, totalLines } = useMemo(() => {
    const totalSpend = purchases.reduce((sum, purchase) => sum + parseFloat(purchase.totalCost), 0);
    const lineCount = purchases.reduce((count, purchase) => count + purchase.items.length, 0);
    return {
      spend: totalSpend,
      avgLineCost: lineCount ? totalSpend / lineCount : 0,
      totalLines: lineCount,
    };
  }, [purchases]);

  const triggerAction = (path: string, payload: Record<string, unknown>) => () =>
    integrationMutation.mutate({ path, payload });

  const logout = () => {
    authStore.getState().clearSession();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Resale OS</p>
            <h1 className="text-2xl font-semibold text-slate-900">Operations Dashboard</h1>
          </div>
          <div className="flex gap-3">
            <Link
              to="/listings/new"
              className="flex items-center gap-2 rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/10"
            >
              Listing Composer
            </Link>
            <button
              className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand"
              onClick={() => window.open('/api/docs', '_blank')}
            >
              API Docs
            </button>
            <button
              className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
              onClick={logout}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-8 max-w-6xl px-6">
        <section className="grid gap-4 md:grid-cols-3">
          <StatCard label="Recent Spend" value={formatCurrency(spend)} description="Last 10 purchases" />
          <StatCard label="Average Line Cost" value={formatCurrency(avgLineCost)} description="Avg per line item" />
          <StatCard label="Inventory Lines" value={totalLines.toString()} />
        </section>

        <section className="mt-8 flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Purchasing</p>
                <h2 className="text-xl font-semibold text-slate-900">Latest intake</h2>
              </div>
              <button className="text-sm font-semibold text-brand hover:text-brand-dark">View all</button>
            </div>
            <PurchasesTable purchases={purchases} loading={purchasesLoading} />

            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Listings</p>
                  <h2 className="text-xl font-semibold text-slate-900">Cross-platform status</h2>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {listings.slice(0, 4).map((listing) => (
                  <div key={listing.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {listing.platform}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{listing.title}</p>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(listing.askingPrice)}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {listing.purchaseItem?.purchase?.orderNumber ?? 'Untracked batch'}
                    </p>
                  </div>
                ))}
                {!listings.length ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-100 p-6 text-center text-sm text-slate-500 md:col-span-2">
                    No listings synced yet.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <aside className="w-full max-w-sm space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Quick Actions</h3>
                {integrationMutation.isPending ? (
                  <RefreshCw size={16} className="animate-spin text-brand" />
                ) : null}
              </div>
              <div className="mt-4 space-y-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:border-brand hover:text-brand"
                    onClick={triggerAction(action.path, action.payload)}
                    disabled={integrationMutation.isPending}
                  >
                    {action.label}
                    <span aria-hidden>→</span>
                  </button>
                ))}
              </div>
            </div>

            <MediaUploadPanel purchases={purchases} />

            <div className="rounded-2xl border border-dashed border-brand/40 bg-brand/5 p-5">
              <p className="text-sm font-semibold text-brand">Shipping + Payments</p>
              <p className="mt-2 text-xs text-slate-600">
                Stripe, Shippo, and marketplace integrations will surface progress here soon.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
};
