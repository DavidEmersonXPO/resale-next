interface StatCardProps {
  label: string;
  value: string;
  description?: string;
}

export const StatCard = ({ label, value, description }: StatCardProps) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow">
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
  </div>
);
