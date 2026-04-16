import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as Google from 'expo-auth-session/providers/google';
import { api } from '@/services/api';
import { User, ApiResponse } from '@/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AuthStore');

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  setToken: (token: string) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    logger.info('Initializing auth state');
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        const res = await api.get<ApiResponse<User>>('/auth/me');
        if (res.success && res.data) {
          set({ user: res.data, token, isAuthenticated: true });
          logger.info('Session restored', { userId: res.data.id });
        } else {
          await SecureStore.deleteItemAsync('auth_token');
        }
      }
    } catch (err) {
      logger.warn('Auth init failed', err);
      await SecureStore.deleteItemAsync('auth_token');
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithGoogle: async () => {
    logger.info('Starting Google sign-in');
    set({ isLoading: true });
    try {
      // This triggers via expo-auth-session in the component
      // The actual token exchange happens via signInWithGoogleToken
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    logger.info('Signing out');
    try {
      await api.post('/auth/signout');
    } catch {
      // ignore server error — always clear local state
    }
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('refresh_token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: async (updates) => {
    const res = await api.put<ApiResponse<User>>('/auth/me', updates);
    if (res.success && res.data) {
      set({ user: res.data });
    }
  },

  setToken: async (token) => {
    await SecureStore.setItemAsync('auth_token', token);
    set({ token });
  },
}));

// ─── Selector helpers ─────────────────────────────────────────────────────────

export const useUser = () => useAuthStore((s) => s.user);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
export const useIsAuthLoading = () => useAuthStore((s) => s.isLoading);
export const usePlan = () => useAuthStore((s) => s.user?.plan ?? 'free');
