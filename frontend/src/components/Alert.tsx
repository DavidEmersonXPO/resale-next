import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  type: AlertType;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const alertConfig = {
  success: {
    icon: CheckCircle,
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    iconColor: 'text-emerald-600',
  },
  error: {
    icon: XCircle,
    classes: 'border-red-200 bg-red-50 text-red-700',
    iconColor: 'text-red-600',
  },
  warning: {
    icon: AlertCircle,
    classes: 'border-amber-200 bg-amber-50 text-amber-700',
    iconColor: 'text-amber-600',
  },
  info: {
    icon: Info,
    classes: 'border-blue-200 bg-blue-50 text-blue-700',
    iconColor: 'text-blue-600',
  },
};

export const Alert = ({ type, message, dismissible, onDismiss }: AlertProps) => {
  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${config.classes}`}>
      <div className="flex items-start gap-3">
        <Icon size={18} className={`mt-0.5 flex-shrink-0 ${config.iconColor}`} />
        <p className="flex-1">{message}</p>
        {dismissible && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="flex-shrink-0 hover:opacity-70"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
};
