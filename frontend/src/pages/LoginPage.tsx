import type { FormEvent } from 'react';
import { useState } from 'react';
import { useLogin } from '../hooks/useAuth';
import { authStore } from '../stores/auth-store';

export const LoginPage = () => {
  const loginMutation = useLogin();
  const [form, setForm] = useState({ email: '', password: '' });
  const error = loginMutation.error instanceof Error ? loginMutation.error.message : null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    loginMutation.mutate(form);
  };

  const isAuthenticated = Boolean(authStore.getState().token);
  if (isAuthenticated) {
    window.location.href = '/';
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white/95 p-8 shadow-2xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Resale OS</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Sign in to dashboard</h1>
        </div>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand focus:outline-none"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Password</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand focus:outline-none"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          <button
            type="submit"
            className="w-full rounded-2xl bg-brand py-3 text-sm font-semibold text-white shadow hover:bg-brand-dark disabled:opacity-60"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'Authenticating…' : 'Access dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};
