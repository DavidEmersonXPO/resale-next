import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  setSession: (payload: { token: string; user: User }) => void;
  clearSession: () => void;
  hydrateFromStorage: () => void;
}

const STORAGE_KEY = 'resale-auth';

export const authStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  hydrated: false,
  setSession: ({ token, user }) => {
    set({ token, user, hydrated: true });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
  },
  clearSession: () => {
    set({ token: null, user: null, hydrated: true });
    localStorage.removeItem(STORAGE_KEY);
  },
  hydrateFromStorage: () => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        set({ token: parsed.token, user: parsed.user, hydrated: true });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        set({ hydrated: true });
      }
    } else {
      set({ hydrated: true });
    }
  },
}));
