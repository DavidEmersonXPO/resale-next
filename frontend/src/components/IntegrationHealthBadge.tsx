import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';

export type HealthStatus = 'healthy' | 'degraded' | 'error' | 'pending';

interface IntegrationHealthBadgeProps {
  name: string;
  status: HealthStatus;
  lastSync?: Date | string | null;
  message?: string;
}

const statusConfig = {
  healthy: {
    icon: CheckCircle,
    label: 'Healthy',
    classes: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  degraded: {
    icon: AlertCircle,
    label: 'Degraded',
    classes: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  error: {
    icon: XCircle,
    label: 'Error',
    classes: 'bg-red-100 text-red-700 border-red-200',
  },
  pending: {
    icon: Clock,
    label: 'Pending',
    classes: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

export const IntegrationHealthBadge = ({
  name,
  status,
  lastSync,
  message,
}: IntegrationHealthBadgeProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  const formatLastSync = (date: Date | string | null | undefined) => {
    if (!date) return 'Never';
    const syncDate = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - syncDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return syncDate.toLocaleDateString();
  };

  return (
    <div className={`rounded-2xl border p-4 ${config.classes}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{name}</p>
          <p className="mt-1 text-xs opacity-80">
            Last sync: {formatLastSync(lastSync)}
          </p>
          {message && (
            <p className="mt-2 text-xs opacity-90">{message}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Icon size={14} />
          <span>{config.label}</span>
        </div>
      </div>
    </div>
  );
};
