'use client';

import type { MeDto, PermissionKey } from '@repo/types';
import { create } from 'zustand';

export interface AuthState {
  accessToken: string | null;
  user: MeDto | null;
  isHydrated: boolean;

  setSession: (input: {
    accessToken: string;
    refreshToken: string;
    user: MeDto;
  }) => Promise<void>;
  setAccessToken: (token: string) => void;
  setUser: (user: MeDto) => void;
  clearSession: () => Promise<void>;
  hasPermission: (key: PermissionKey) => boolean;
  markHydrated: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  isHydrated: false,

  setSession: async ({ accessToken, refreshToken, user }) => {
    set({ accessToken, user });
    await fetch('/api/auth/set-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include',
    });
  },

  setAccessToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),

  clearSession: async () => {
    set({ accessToken: null, user: null });
    await fetch('/api/auth/clear-session', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
  },

  hasPermission: (key) => {
    const u = get().user;
    return !!u && u.permissions.includes(key);
  },

  markHydrated: () => set({ isHydrated: true }),
}));
