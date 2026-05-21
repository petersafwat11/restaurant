'use client';

import { useAuthStore } from '@/stores/auth-store';
import type { PermissionKey } from '@repo/types';

/**
 * Permission helpers backed by the auth store. Re-uses the auth store's
 * `hasPermission` so there's a single source of truth. The backend re-checks
 * every protected route via `PermissionsGuard` — this hook is for UI gating
 * (hiding buttons, filtering nav items, etc.) only.
 */
export function usePermissions() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const user = useAuthStore((s) => s.user);

  return {
    has: hasPermission,
    hasAny: (...keys: PermissionKey[]) => keys.some((k) => hasPermission(k)),
    hasAll: (...keys: PermissionKey[]) => keys.every((k) => hasPermission(k)),
    roles: user?.roles ?? [],
    user,
  };
}
