'use client';

import { usePermissions } from '@/features/auth/hooks';
import { useAuthStore } from '@/stores/auth-store';
import type { PermissionKey } from '@repo/types';
import { Lock } from 'lucide-react';
import * as React from 'react';

export interface RequirePermissionProps {
  perm: PermissionKey | PermissionKey[];
  /** Require all permissions in the array (default) or any of them. */
  mode?: 'all' | 'any';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Gate the entire subtree behind a permission check. The auth store is
 * client-side (refresh cookie + zustand hydration), so this runs client-side
 * even though it's typically placed at the top of a page component.
 *
 * The backend re-checks every protected route via `PermissionsGuard`; this
 * exists for UX, not security.
 */
export function RequirePermission({
  perm,
  mode = 'all',
  fallback,
  children,
}: RequirePermissionProps) {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const { has, hasAll, hasAny } = usePermissions();

  if (!isHydrated) return null;

  const keys: PermissionKey[] = Array.isArray(perm) ? perm : [perm];
  const [first, ...rest] = keys;
  const allowed = !first
    ? true
    : rest.length === 0
      ? has(first)
      : mode === 'all'
        ? hasAll(first, ...rest)
        : hasAny(first, ...rest);

  if (!allowed) {
    return <>{fallback ?? <PermissionDenied keys={keys} />}</>;
  }
  return <>{children}</>;
}

function PermissionDenied({ keys }: { keys: PermissionKey[] }) {
  return (
    <div
      role="alert"
      className="mx-auto mt-12 max-w-md rounded-lg border-hairline-strong bg-surface p-6 text-center"
    >
      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-fg-muted">
        <Lock size={18} />
      </div>
      <div className="text-sm font-medium text-fg">You don&apos;t have access to this page</div>
      <div className="mt-1 text-xs text-fg-subtle">
        Requires: <span className="font-mono">{keys.join(', ')}</span>
      </div>
      <div className="mt-3 text-xs text-fg-subtle">
        Ask your owner or admin to grant the required permission.
      </div>
    </div>
  );
}
