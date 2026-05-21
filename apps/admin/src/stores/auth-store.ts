'use client';

import type { MeDto, PermissionKey } from '@repo/types';
import { create } from 'zustand';

export interface AuthState {
  user: MeDto | null;
  isHydrated: boolean;

  setSession: (input: { user: MeDto }) => void;
  setUser: (user: MeDto) => void;
  clearSession: () => void;
  hasPermission: (key: PermissionKey) => boolean;
  markHydrated: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isHydrated: false,

  setSession: ({ user }) => set({ user }),
  setUser: (user) => set({ user }),
  clearSession: () => set({ user: null }),

  hasPermission: (key) => {
    const u = get().user;
    return !!u && u.permissions.includes(key);
  },

  markHydrated: () => set({ isHydrated: true }),
}));
