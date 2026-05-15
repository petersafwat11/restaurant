/**
 * Single source of truth for permission keys.
 * Imported by:
 *   - apps/api (PermissionsGuard)
 *   - packages/db/seed.ts (role→permission mapping is duplicated there to keep
 *     seed runnable in isolation; if you change this file, update seed.ts too)
 *   - frontends (for UI gating via hasPermission())
 */

export const PERMISSION_KEYS = [
  'order:read',
  'order:create',
  'order:update',
  'order:status_update',
  'order:cancel',
  'order:refund',
  'menu:read',
  'menu:write',
  'restaurant:read',
  'restaurant:write',
  'customer:read',
  'customer:write',
  'promotion:read',
  'promotion:write',
  'reservation:read',
  'reservation:write',
  'review:read',
  'review:moderate',
  'staff:read',
  'staff:write',
  'reports:read',
  'settings:read',
  'settings:write',
  'payment:create',
  'payment:read',
  'payment:refund',
  'kitchen:read',
  'customer:notes',
  'analytics:read',
  'report:read',
  'report:export',
  'audit:read',
  'contact:read',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type RoleKey = 'owner' | 'manager' | 'kitchen' | 'cashier' | 'customer';

export const ROLE_PERMISSIONS: Record<RoleKey, readonly PermissionKey[]> = {
  owner: PERMISSION_KEYS,
  manager: PERMISSION_KEYS.filter((p) => p !== 'staff:write' && p !== 'settings:write'),
  kitchen: ['order:read', 'order:status_update', 'kitchen:read'],
  cashier: [
    'order:read',
    'order:create',
    'payment:create',
    'payment:read',
    'kitchen:read',
    'reservation:read',
    'reservation:write',
    'customer:read',
  ],
  customer: [],
};
