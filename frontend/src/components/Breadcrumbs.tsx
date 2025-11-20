import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path: string;
}

const routeMap: Record<string, string> = {
  '': 'Dashboard',
  'purchases': 'Purchases',
  'listings': 'Listings',
  'new': 'New Listing',
  'settings': 'Settings',
  'platform-credentials': 'Platform Credentials',
  'listing-templates': 'Listing Templates',
};

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  if (pathSegments.length === 0) {
    return null;
  }

  const breadcrumbs: BreadcrumbItem[] = pathSegments.map((segment, index) => {
    const path = `/${pathSegments.slice(0, index + 1).join('/')}`;
    const label = routeMap[segment] || segment;
    return { label, path };
  });

  return (
    <nav className="flex items-center gap-2 text-sm">
      <Link
        to="/"
        className="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <Home size={16} />
        <span>Home</span>
      </Link>
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.path} className="flex items-center gap-2">
          <ChevronRight size={16} className="text-slate-400" />
          {index === breadcrumbs.length - 1 ? (
            <span className="font-medium text-slate-900">{crumb.label}</span>
          ) : (
            <Link
              to={crumb.path}
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
};
