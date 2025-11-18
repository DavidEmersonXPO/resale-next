import type { Purchase } from '../types/purchase';
import { formatCurrency, formatDate } from '../utils/formatters';

interface PurchasesTableProps {
  purchases: Purchase[];
  loading?: boolean;
}

const statusStyles: Record<string, string> = {
  IN_STOCK: 'bg-blue-100 text-blue-700',
  LISTED: 'bg-amber-100 text-amber-700',
  SOLD: 'bg-emerald-100 text-emerald-700',
  RESERVED: 'bg-purple-100 text-purple-700',
};

export const PurchasesTable = ({ purchases, loading }: PurchasesTableProps) => {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        Loading latest purchases…
      </div>
    );
  }

  if (!purchases.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
        No purchases recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Purchase</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Source</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Items</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Total</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {purchases.map((purchase) => (
            <tr key={purchase.id} className="hover:bg-slate-50">
              <td className="px-4 py-4">
                <div className="text-sm font-semibold text-slate-900">
                  {purchase.orderNumber ?? 'Unnumbered batch'}
                </div>
                <div className="text-xs text-slate-500">{formatDate(purchase.purchaseDate)}</div>
              </td>
              <td className="px-4 py-4">
                <div className="text-sm text-slate-800">{purchase.source.replace('_', ' ')}</div>
                {purchase.supplier ? (
                  <div className="text-xs text-slate-500">{purchase.supplier.name}</div>
                ) : null}
              </td>
              <td className="px-4 py-4 text-sm text-slate-700">
                {purchase.items.length} line{purchase.items.length === 1 ? '' : 's'}
              </td>
              <td className="px-4 py-4 text-sm font-semibold text-slate-900">{formatCurrency(purchase.totalCost)}</td>
              <td className="px-4 py-4">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[purchase.status] ?? 'bg-slate-100 text-slate-700'}`}
                >
                  {purchase.status.replace('_', ' ')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
