import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PurchasesTable } from '../components/PurchasesTable';
import { StatCard } from '../components/StatCard';
import { usePurchases } from '../hooks/usePurchases';
import { useListings } from '../hooks/useListings';
import { useIntegrationTrigger } from '../hooks/useIntegrationTrigger';
import { formatCurrency } from '../utils/formatters';
import { RefreshCw } from 'lucide-react';
import { MediaUploadPanel } from '../components/MediaUploadPanel';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import axios from 'axios';
import { AppLayout } from '../components/AppLayout';
import { queueListingPublish, getListingPublishJobStatus } from '../lib/listing-publisher';
import type {
  ListingPublishQueueItem,
  ListingPublishQueueResponse,
} from '../types/listing';
import { useListingPublishJobs } from '../hooks/useListingPublishJobs';
import { useEbayPolicyLogs } from '../hooks/useEbayPolicyLogs';

type QuickAction = {
  label: string;
  path: string;
  buildPayload: () => Record<string, unknown> | undefined;
  successMessage: string;
};

export const DashboardPage = () => {
  const { data: purchaseData, isLoading: purchasesLoading } = usePurchases();
  const { data: listingData } = useListings();
  const integrationMutation = useIntegrationTrigger();
  const purchases = purchaseData?.data ?? [];
  const listings = listingData?.data ?? [];
  const queryClient = useQueryClient();
  const [publishNotice, setPublishNotice] = useState<
    { message: string; type: 'success' | 'error' | 'info' } | null
  >(null);
  const [kitNotice, setKitNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [integrationNotice, setIntegrationNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const publishJobTimers = useRef<number[]>([]);
  const isMounted = useRef(true);
  const { data: publishJobsData, isFetching: publishJobsFetching } = useListingPublishJobs(6);
  const publishJobs = publishJobsData ?? [];
  const { data: policyLogs = [] } = useEbayPolicyLogs(5);
  const latestPolicyLog = policyLogs.at(0);
  const [jobPlatformFilter, setJobPlatformFilter] = useState<string>('ALL');
  const [jobStateFilter, setJobStateFilter] = useState<string>('ALL');

  useEffect(() => {
    return () => {
      isMounted.current = false;
      publishJobTimers.current.forEach((timerId) => window.clearTimeout(timerId));
      publishJobTimers.current = [];
    };
  }, []);
  const quickActions: QuickAction[] = [
    {
      label: 'Sync Goodwill manifest',
      path: '/integrations/goodwill/sync',
      buildPayload: () => undefined,
      successMessage: 'Goodwill sync triggered. Check the integrations log for progress.',
    },
    {
      label: 'Sync Salvation Army invoice',
      path: '/integrations/salvation-army/invoices',
      buildPayload: () => ({
        invoiceNumber: `SA-${Date.now()}`,
        invoiceDate: new Date().toISOString(),
        total: 0,
        shipping: 0,
        fees: 0,
        warehouse: 'Quick Action',
        items: [
          {
            description: 'Placeholder line item',
            quantity: 1,
            price: 0,
            lotNumber: 'QA',
          },
        ],
      }),
      successMessage: 'Salvation Army invoice submitted. Review it under Purchases.',
    },
  ];

  const { spend, avgLineCost, totalLines } = useMemo(() => {
    const totalSpend = purchases.reduce((sum, purchase) => sum + parseFloat(purchase.totalCost), 0);
    const lineCount = purchases.reduce((count, purchase) => count + purchase.items.length, 0);
    return {
      spend: totalSpend,
      avgLineCost: lineCount ? totalSpend / lineCount : 0,
      totalLines: lineCount,
    };
  }, [purchases]);

  const getErrorMessage = (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data;
      if (typeof data === 'string') {
        return data;
      }
      if (data?.message) {
        return Array.isArray(data.message) ? data.message.join(', ') : data.message;
      }
      return error.message;
    }
    return 'Integration request failed.';
  };

  const formatPlatformLabel = (platform: string) =>
    platform.replace(/_/g, ' ');

  const formatTimestamp = (value: number | null | undefined) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString();
    } catch {
      return '—';
    }
  };

  const formatJobStateLabel = (state: string) => {
    switch (state) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'active':
        return 'In progress';
      case 'waiting':
        return 'Waiting';
      case 'delayed':
        return 'Delayed';
      default:
        return state;
    }
  };

  const filteredPublishJobs = useMemo(() => {
    return publishJobs.filter((job) => {
      const platformMatch =
        jobPlatformFilter === 'ALL' || job.platform === jobPlatformFilter;
      const stateMatch =
        jobStateFilter === 'ALL' || job.state === jobStateFilter;
      return platformMatch && stateMatch;
    });
  }, [publishJobs, jobPlatformFilter, jobStateFilter]);

  const uniqueJobStates = useMemo(() => {
    const states = new Set<string>(publishJobs.map((job) => job.state));
    return Array.from(states).sort();
  }, [publishJobs]);

  const uniquePlatforms = useMemo(() => {
    const platforms = new Set<string>(publishJobs.map((job) => job.platform));
    return Array.from(platforms).sort();
  }, [publishJobs]);

  const downloadJobsCsv = () => {
    if (!filteredPublishJobs.length) {
      return;
    }
    const header = [
      'Job ID',
      'Listing ID',
      'Listing Title',
      'Listing Status',
      'Platform',
      'State',
      'Queued At',
      'Finished On',
      'Attempts',
      'Result Message',
    ];
    const rows = filteredPublishJobs.map((job) => [
      job.jobId,
      job.listingId,
      job.listingTitle,
      job.listingStatus,
      job.platform,
      job.state,
      new Date(job.queuedAt).toISOString(),
      job.finishedOn ? new Date(job.finishedOn).toISOString() : '',
      String(job.attemptsMade),
      job.failedReason ?? job.returnValue?.message ?? '',
    ]);
    const csv = [header, ...rows]
      .map((cols) =>
        cols
          .map((value) => {
            const stringValue = value ?? '';
            return `"${String(stringValue).replace(/"/g, '""')}"`;
          })
          .join(','),
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `listing-publish-jobs-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const pollPublishJobStatus = (job: ListingPublishQueueItem, attempt = 0) => {
    const timeoutId = window.setTimeout(async () => {
      publishJobTimers.current = publishJobTimers.current.filter(
        (id) => id !== timeoutId,
      );
      if (!isMounted.current) {
        return;
      }
      try {
        const status = await getListingPublishJobStatus(job.jobId);
        if (!isMounted.current) {
          return;
        }
        if (status.state === 'completed') {
          const resultStatus = status.returnValue?.status ?? 'live';
          setPublishNotice({
            type: 'success',
            message: `Published to ${formatPlatformLabel(status.platform)} (${resultStatus}).`,
          });
          void queryClient.invalidateQueries({ queryKey: ['listings'] });
          void queryClient.invalidateQueries({ queryKey: ['listing-publish-jobs'] });
          return;
        }
        if (status.state === 'failed') {
          setPublishNotice({
            type: 'error',
            message:
              status.failedReason ??
              `Publish to ${formatPlatformLabel(status.platform)} failed.`,
          });
          void queryClient.invalidateQueries({ queryKey: ['listing-publish-jobs'] });
          return;
        }
        if (attempt < 5) {
          pollPublishJobStatus(job, attempt + 1);
        }
      } catch (error) {
        if (attempt < 5 && isMounted.current) {
          pollPublishJobStatus(job, attempt + 1);
        }
      }
    }, 3000);

    publishJobTimers.current.push(timeoutId);
  };

  const triggerAction = (action: QuickAction) => () => {
    setIntegrationNotice(null);
    integrationMutation.mutate(
      { path: action.path, payload: action.buildPayload() },
      {
        onSuccess: () => {
          setIntegrationNotice({ type: 'success', message: action.successMessage });
        },
        onError: (error) => {
          setIntegrationNotice({ type: 'error', message: getErrorMessage(error) });
        },
      },
    );
  };

  const downloadListingKit = async (listingId: string, listingTitle: string) => {
    setKitNotice(null);
    try {
      const response = await apiClient.get<Blob>(`/listings/${listingId}/kit`, {
        responseType: 'blob',
      });

      const contentDisposition = response.headers['content-disposition'] ?? '';
      const match = contentDisposition.match(/filename="?([^"]+)"?/i);
      const filename = match?.[1] ?? `${listingTitle.replace(/\s+/g, '-').toLowerCase()}-kit.zip`;

      const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setKitNotice({
        type: 'success',
        message: `Listing kit for “${listingTitle}” downloaded.`,
      });
    } catch (error) {
      const message = getErrorMessage(error);
      setKitNotice({
        type: 'error',
        message: `Unable to download kit: ${message}`,
      });
    }
  };

  const publishListingMutation = useMutation({
    mutationFn: async ({ listingId }: { listingId: string }) => {
      return queueListingPublish(listingId, {});
    },
    onSuccess: (response: ListingPublishQueueResponse) => {
      if (response.failures.length) {
        const failure = response.failures[0];
        setPublishNotice({
          type: 'error',
          message:
            failure.message ??
            `Unable to queue publish for ${formatPlatformLabel(failure.platform)}.`,
        });
        return;
      }
      if (response.queued.length) {
        const platforms = response.queued
          .map((job) => formatPlatformLabel(job.platform))
          .join(', ');
        setPublishNotice({
          type: 'info',
          message: `Queued publish to ${platforms}. Monitoring status…`,
        });
        response.queued.forEach((job) => pollPublishJobStatus(job));
        void queryClient.invalidateQueries({ queryKey: ['listing-publish-jobs'] });
        return;
      }
      setPublishNotice({
        type: 'error',
        message: 'No publish jobs were queued.',
      });
    },
    onError: () => {
      setPublishNotice({ message: 'Failed to publish listing.', type: 'error' });
    },
  });

  return (
    <AppLayout>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Resale OS</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Operations Dashboard</h1>
            <p className="text-sm text-slate-500">Monitor purchasing velocity and listing readiness at a glance.</p>
          </div>
          <button
            className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand"
            onClick={() => window.open('/api/docs', '_blank')}
          >
            API Docs
          </button>
        </div>
      </div>

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
              <Link className="text-sm font-semibold text-brand hover:text-brand-dark" to="/purchases">
                View all
              </Link>
            </div>
            <PurchasesTable purchases={purchases} loading={purchasesLoading} />

            {publishNotice ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  publishNotice.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : publishNotice.type === 'error'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                {publishNotice.message}
              </div>
            ) : null}
            {kitNotice ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  kitNotice.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {kitNotice.message}
              </div>
            ) : null}
            {latestPolicyLog?.result === 'failure' ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
                Latest eBay policy refresh failed at{' '}
                {formatTimestamp(Date.parse(latestPolicyLog.createdAt))}.{' '}
                {latestPolicyLog.message}
              </div>
            ) : latestPolicyLog ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-600">
                Last eBay policy refresh succeeded at{' '}
                {formatTimestamp(Date.parse(latestPolicyLog.createdAt))}.
              </div>
            ) : null}

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
                      <span className="text-sm font-semibold text-slate-900">
                        {formatCurrency(listing.askingPrice, listing.currency)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {listing.purchaseItem?.purchase?.orderNumber ?? 'Untracked batch'}
                      {listing.platformCredential
                        ? ` • ${listing.platformCredential.accountName}`
                        : ''}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          className="text-xs font-semibold text-slate-600 hover:text-brand"
                          onClick={() => downloadListingKit(listing.id, listing.title)}
                        >
                          Download kit
                        </button>
                        {listing.platformCredential ? (
                          <button
                            type="button"
                            className="text-xs font-semibold text-brand hover:text-brand-dark disabled:opacity-60"
                            onClick={() => publishListingMutation.mutate({ listingId: listing.id })}
                            disabled={publishListingMutation.isPending}
                          >
                            {publishListingMutation.isPending ? 'Publishing…' : 'Publish draft'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Assign a credential to enable publishing.</span>
                        )}
                      </div>
                      <span className="text-xs uppercase tracking-wide text-slate-400">{listing.status}</span>
                    </div>
                  </div>
                ))}
                {!listings.length ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-100 p-6 text-center text-sm text-slate-500 md:col-span-2">
                    No listings synced yet.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Automation</p>
                  <h2 className="text-sm font-semibold text-slate-900">Recent publish jobs</h2>
                </div>
                <span className="text-xs text-slate-400">
                  {publishJobsFetching ? 'Refreshing…' : `Showing ${filteredPublishJobs.length}`}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <label className="flex items-center gap-2">
                  Platform
                  <select
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                    value={jobPlatformFilter}
                    onChange={(event) => setJobPlatformFilter(event.target.value)}
                  >
                    <option value="ALL">All</option>
                    {uniquePlatforms.map((platform) => (
                      <option key={platform} value={platform}>
                        {formatPlatformLabel(platform)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  State
                  <select
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                    value={jobStateFilter}
                    onChange={(event) => setJobStateFilter(event.target.value)}
                  >
                    <option value="ALL">All</option>
                    {uniqueJobStates.map((state) => (
                      <option key={state} value={state}>
                        {formatJobStateLabel(state)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="ml-auto rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand"
                  onClick={downloadJobsCsv}
                  disabled={!filteredPublishJobs.length}
                >
                  Download CSV
                </button>
              </div>
              <div className="mt-3 space-y-3 text-xs text-slate-600">
                {!filteredPublishJobs.length && !publishJobsFetching ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-6 text-center text-slate-400">
                    No jobs yet. Queue a publish to see progress here.
                  </div>
                ) : null}
                {filteredPublishJobs.map((job) => (
                  <div
                    key={job.jobId}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">
                          {job.listingTitle}
                        </p>
                        <p className="mt-0.5 text-[11px] uppercase tracking-wider text-slate-400">
                          {formatPlatformLabel(job.platform)} • {formatJobStateLabel(job.state)}
                        </p>
                      </div>
                      <div
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          job.state === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : job.state === 'failed'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {job.returnValue?.status ?? job.state}
                      </div>
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <p className="text-[11px] text-slate-500">
                        Queued: {formatTimestamp(job.queuedAt)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Finished: {formatTimestamp(job.finishedOn ?? null)}
                      </p>
                    </div>
                    {job.failedReason ? (
                      <p className="mt-2 rounded-md bg-red-50 px-2 py-1 text-[11px] text-red-600">
                        {job.failedReason}
                      </p>
                    ) : job.returnValue?.message ? (
                      <p className="mt-2 rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                        {job.returnValue.message}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Policy refresh history</span>
                  <span>{policyLogs.length ? `${policyLogs.length} records` : 'No logs yet'}</span>
                </div>
                <div className="space-y-2">
                  {policyLogs.length ? (
                    policyLogs.map((log) => (
                      <div
                        key={log.id}
                        className={`rounded-lg border px-3 py-2 ${
                          log.result === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-red-200 bg-red-50 text-red-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold capitalize">{log.result}</span>
                          <span className="text-[11px] text-slate-500">{formatTimestamp(Date.parse(log.createdAt))}</span>
                        </div>
                        {log.message ? (
                          <p className="mt-1 text-[11px] text-slate-600">{log.message}</p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center">
                      No refresh attempts recorded yet.
                    </div>
                  )}
                </div>
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
              {integrationNotice ? (
                <div
                  className={`mt-3 rounded-2xl border px-3 py-2 text-xs ${
                    integrationNotice.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {integrationNotice.message}
                </div>
              ) : null}
              <div className="mt-4 space-y-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:border-brand hover:text-brand"
                    onClick={triggerAction(action)}
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
    </AppLayout>
  );
};
