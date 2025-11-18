import { useState } from 'react';
import type { Purchase } from '../types/purchase';
import { useMediaUpload } from '../hooks/useMediaUpload';

interface MediaUploadPanelProps {
  purchases: Purchase[];
}

export const MediaUploadPanel = ({ purchases }: MediaUploadPanelProps) => {
  const mediaMutation = useMediaUpload();
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);

  const flattenedItems = purchases.flatMap((purchase) =>
    purchase.items.map((item) => ({
      id: item.id,
      label: `${purchase.orderNumber ?? 'Batch'} · ${item.title}`,
    })),
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !selectedItemId) return;
    mediaMutation.mutate({ purchaseItemId: selectedItemId, file });
    setFile(null);
  };

  return (
    <form className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" onSubmit={handleSubmit}>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Attach Photo</p>
        <p className="text-xs text-slate-500">Uploads store locally for now; CDN-ready later.</p>
      </div>

      <select
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        value={selectedItemId}
        onChange={(event) => setSelectedItemId(event.target.value)}
        required
      >
        <option value="">Select inventory line</option>
        {flattenedItems.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>

      <input
        type="file"
        accept="image/*"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        className="text-sm text-slate-600"
        required
      />

      <button
        type="submit"
        className="w-full rounded-xl bg-brand py-2 text-sm font-semibold text-white disabled:opacity-50"
        disabled={mediaMutation.isPending}
      >
        {mediaMutation.isPending ? 'Uploading…' : 'Upload photo'}
      </button>

      {mediaMutation.isError ? (
        <p className="text-xs text-red-500">Upload failed. Check file size & try again.</p>
      ) : null}
      {mediaMutation.isSuccess ? (
        <p className="text-xs text-emerald-600">Photo attached successfully.</p>
      ) : null}
    </form>
  );
};
