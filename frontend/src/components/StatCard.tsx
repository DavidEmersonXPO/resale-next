import { TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  description?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  icon?: LucideIcon;
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'error';
}

const variantStyles = {
  default: 'border-slate-200 bg-white',
  accent: 'border-brand/20 bg-brand/5',
  success: 'border-emerald-200 bg-emerald-50',
  warning: 'border-amber-200 bg-amber-50',
  error: 'border-red-200 bg-red-50',
};

const trendStyles = {
  up: 'text-emerald-600',
  down: 'text-red-600',
};

export const StatCard = ({
  label,
  value,
  description,
  trend,
  icon: Icon,
  variant = 'default',
}: StatCardProps) => (
  <div className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow ${variantStyles[variant]}`}>
    <div className="flex items-start justify-between">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      {Icon && (
        <div className="rounded-lg bg-slate-100 p-2">
          <Icon size={18} className="text-slate-600" />
        </div>
      )}
    </div>
    <div className="mt-2 flex items-end gap-2">
      <p className="text-3xl font-semibold text-slate-900">{value}</p>
      {trend && (
        <div className={`flex items-center gap-1 text-sm font-semibold ${trendStyles[trend.direction]}`}>
          {trend.direction === 'up' ? (
            <TrendingUp size={16} />
          ) : (
            <TrendingDown size={16} />
          )}
          <span>{Math.abs(trend.value)}%</span>
        </div>
      )}
    </div>
    {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
  </div>
);
