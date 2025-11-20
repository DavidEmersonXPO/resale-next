import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onDismiss: (id: string) => void;
}

const toastConfig = {
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

export const Toast = ({ id, type, message, duration = 5000, onDismiss }: ToastProps) => {
  const config = toastConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);

  return (
    <div
      className={`animate-slide-in-right flex items-start gap-3 rounded-2xl border p-4 shadow-lg ${config.classes}`}
      role="alert"
    >
      <Icon size={20} className={`mt-0.5 flex-shrink-0 ${config.iconColor}`} />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
        aria-label="Dismiss notification"
      >
        <X size={18} />
      </button>
    </div>
  );
};
