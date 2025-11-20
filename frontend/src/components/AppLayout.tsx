import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LogOut,
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  Settings,
  Zap,
  Link2,
} from 'lucide-react';
import { authStore } from '../stores/auth-store';
import { Breadcrumbs } from './Breadcrumbs';

interface NavSection {
  title: string;
  links: {
    to: string;
    label: string;
    icon: typeof LayoutDashboard;
  }[];
}

const navSections: NavSection[] = [
  {
    title: 'Operations',
    links: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/purchases', label: 'Purchases', icon: ShoppingCart },
      { to: '/listings/new', label: 'Listing Composer', icon: FileText },
    ],
  },
  {
    title: 'Inventory',
    links: [
      { to: '/inventory', label: 'Items', icon: Package },
    ],
  },
  {
    title: 'Integrations',
    links: [
      { to: '/settings/platform-credentials', label: 'Platforms', icon: Link2 },
      { to: '/integrations/goodwill', label: 'Goodwill', icon: Zap },
      { to: '/integrations/salvation-army', label: 'Salvation Army', icon: Zap },
    ],
  },
  {
    title: 'Settings',
    links: [
      { to: '/settings/listing-templates', label: 'Templates', icon: Settings },
    ],
  },
];

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const navigate = useNavigate();

  const logout = () => {
    authStore.getState().clearSession();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="border-b border-slate-200 px-6 py-5">
            <NavLink to="/" className="text-xl font-bold text-slate-900">
              Resale OS
            </NavLink>
            <p className="mt-1 text-xs text-slate-500">Multi-market resale platform</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-6">
            {navSections.map((section) => (
              <div key={section.title} className="mb-6">
                <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.links.map((link) => {
                    const Icon = link.icon;
                    return (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) =>
                          [
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-brand/10 text-brand'
                              : 'text-slate-700 hover:bg-slate-100',
                          ].join(' ')
                        }
                      >
                        <Icon size={18} />
                        <span>{link.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Logout button */}
          <div className="border-t border-slate-200 p-4">
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="border-b border-slate-200 bg-white px-8 py-4">
          <div className="flex items-center justify-between">
            <Breadcrumbs />
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                Production
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-8 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
};
