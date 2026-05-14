import { secureStorage } from '@/lib/secure-storage';
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
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  isHydrated: false,

  setSession: async ({ accessToken, refreshToken, user }) => {
    set({ accessToken, user });
    await secureStorage.setAccessToken(accessToken);
    await secureStorage.setRefreshToken(refreshToken);
  },

  setAccessToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),

  clearSession: async () => {
    set({ accessToken: null, user: null });
    await secureStorage.clearAccessToken().catch(() => {});
    await secureStorage.clearRefreshToken().catch(() => {});
  },

  hasPermission: (key) => {
    const u = get().user;
    return !!u && u.permissions.includes(key);
  },

  hydrate: async () => {
    try {
      const accessToken = await secureStorage.getAccessToken();
      if (accessToken) set({ accessToken });
    } finally {
      set({ isHydrated: true });
    }
  },
}));
