import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  setSession: (payload: { token: string; user: User }) => Promise<void>;
  clearSession: () => Promise<void>;
  hydrate: () => Promise<void>;
}

const STORAGE_KEY = 'resale-mobile-auth';

export const authStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setSession: async ({ token, user }) => {
    set({ token, user });
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify({ token, user }));
  },
  clearSession: async () => {
    set({ token: null, user: null });
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  },
  hydrate: async () => {
    const data = await SecureStore.getItemAsync(STORAGE_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        set({ token: parsed.token, user: parsed.user });
      } catch {
        await SecureStore.deleteItemAsync(STORAGE_KEY);
      }
    }
  },
}));
