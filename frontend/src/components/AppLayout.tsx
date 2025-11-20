import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { authStore } from '../stores/auth-store';

const navLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/purchases', label: 'Purchases' },
  { to: '/listings/new', label: 'Listing Composer' },
  { to: '/settings/platform-credentials', label: 'Platform Credentials' },
  { to: '/settings/listing-templates', label: 'Listing Templates' },
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
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <NavLink to="/" className="text-xl font-semibold text-slate-900">
            Resale OS
          </NavLink>
          <nav className="flex flex-wrap gap-2">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  [
                    'rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
                    isActive
                      ? 'border-brand text-brand'
                      : 'border-slate-200 text-slate-700 hover:border-brand hover:text-brand',
                  ].join(' ')
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
};
