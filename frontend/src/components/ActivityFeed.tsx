import { Clock, Package, FileText, Link2, CheckCircle, XCircle } from 'lucide-react';

export interface ActivityItem {
  id: string;
  type: 'purchase' | 'listing' | 'integration' | 'publish';
  title: string;
  description?: string;
  timestamp: Date | string;
  status?: 'success' | 'error' | 'pending';
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  maxItems?: number;
}

const activityIcons = {
  purchase: Package,
  listing: FileText,
  integration: Link2,
  publish: FileText,
};

const statusConfig = {
  success: {
    icon: CheckCircle,
    classes: 'bg-emerald-100 text-emerald-700',
  },
  error: {
    icon: XCircle,
    classes: 'bg-red-100 text-red-700',
  },
  pending: {
    icon: Clock,
    classes: 'bg-amber-100 text-amber-700',
  },
};

export const ActivityFeed = ({ activities, maxItems = 10 }: ActivityFeedProps) => {
  const displayedActivities = activities.slice(0, maxItems);

  const formatTime = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (!displayedActivities.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
        <p className="text-sm text-slate-500">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayedActivities.map((activity) => {
        const Icon = activityIcons[activity.type];
        const StatusIcon = activity.status ? statusConfig[activity.status].icon : null;

        return (
          <div
            key={activity.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 rounded-lg bg-slate-100 p-2">
                <Icon size={18} className="text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {activity.title}
                </p>
                {activity.description && (
                  <p className="mt-1 text-xs text-slate-500">{activity.description}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">{formatTime(activity.timestamp)}</p>
              </div>
              {StatusIcon && activity.status && (
                <div className={`flex-shrink-0 rounded-full p-1 ${statusConfig[activity.status].classes}`}>
                  <StatusIcon size={14} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
