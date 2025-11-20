import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useListingTemplates } from '../hooks/useListingTemplates';
import { apiClient } from '../lib/api-client';
import { AppLayout } from '../components/AppLayout';

const verticalOptions = ['electronics', 'apparel', 'collectibles', 'home', 'other'];

export const ListingTemplatesPage = () => {
  const { data: templates, isLoading } = useListingTemplates();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    vertical: 'electronics',
    description: '',
    defaultData: '{\n  "title": "",\n  "description": "",\n  "shippingProfile": "standard"\n}',
  });
  const [error, setError] = useState<string | null>(null);

  const createTemplate = useMutation({
    mutationFn: async () => {
      let defaultJson: Record<string, unknown> | undefined;
      try {
        defaultJson = form.defaultData ? JSON.parse(form.defaultData) : undefined;
      } catch (parseError) {
        throw new Error('Default data must be valid JSON.');
      }
      const payload = {
        name: form.name.trim(),
        vertical: form.vertical,
        description: form.description.trim() || undefined,
        defaultData: defaultJson ?? {},
      };
      const { data } = await apiClient.post('/listing-templates', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing-templates'] });
      setForm({
        name: '',
        vertical: 'electronics',
        description: '',
        defaultData: '{\n  "title": "",\n  "description": "",\n  "shippingProfile": "standard"\n}',
      });
      setError(null);
    },
    onError: (mutationError: unknown) => {
      if (mutationError instanceof Error) {
        setError(mutationError.message);
      } else {
        setError('Unable to save template. Please try again.');
      }
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Template name is required.');
      return;
    }
    setError(null);
    createTemplate.mutate();
  };

  return (
    <AppLayout>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Resale OS</p>
          <h1 className="text-2xl font-semibold text-slate-900">Listing Templates</h1>
          <p className="text-sm text-slate-500">
            Maintain canonical data snippets for each vertical and share them with the composer + publisher.
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
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Create</p>
            <h2 className="text-xl font-semibold text-slate-900">New template</h2>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-slate-600">
                Template name
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="e.g., Refurb Electronics"
                  required
                />
              </label>

              <label className="text-sm font-semibold text-slate-600">
                Vertical
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={form.vertical}
                  onChange={(event) => setForm((prev) => ({ ...prev, vertical: event.target.value }))}
                >
                  {verticalOptions.map((vertical) => (
                    <option key={vertical} value={vertical}>
                      {vertical.charAt(0).toUpperCase() + vertical.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="text-sm font-semibold text-slate-600">
              Description
              <textarea
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                rows={2}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Optional summary, shipping rules, etc."
              />
            </label>

            <label className="text-sm font-semibold text-slate-600">
              Default data (JSON)
              <textarea
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
                rows={6}
                value={form.defaultData}
                onChange={(event) => setForm((prev) => ({ ...prev, defaultData: event.target.value }))}
              />
            </label>

            {error ? <p className="text-sm text-red-500">{error}</p> : null}

            <button
              type="submit"
              className="w-full rounded-2xl bg-brand py-3 text-sm font-semibold text-white disabled:opacity-60"
              disabled={createTemplate.isPending}
            >
              {createTemplate.isPending ? 'Saving…' : 'Save template'}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Library</p>
              <h2 className="text-xl font-semibold text-slate-900">Existing templates</h2>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {templates?.length ?? 0} total
            </span>
          </div>

          {isLoading ? (
            <p className="text-sm text-slate-500">Loading templates…</p>
          ) : !templates?.length ? (
            <p className="text-sm text-slate-500">No templates yet. Create one using the form above.</p>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <div key={template.id} className="rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {template.vertical}
                      </p>
                      <p className="text-lg font-semibold text-slate-900">{template.name}</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      {template.updatedAt || template.createdAt
                        ? `Updated ${new Date(
                            template.updatedAt ?? template.createdAt ?? '',
                          ).toLocaleString()}`
                        : 'Updated —'}
                    </p>
                  </div>
                  {template.description ? (
                    <p className="mt-1 text-sm text-slate-600">{template.description}</p>
                  ) : null}
                  <pre className="mt-3 overflow-auto rounded-2xl bg-slate-950/90 p-4 text-xs text-slate-100">
                    {JSON.stringify(template.defaultData ?? {}, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
};
