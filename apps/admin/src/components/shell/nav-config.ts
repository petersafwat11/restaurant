import type { PermissionKey } from '@repo/types';
import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  Cog,
  FileBarChart,
  History,
  Home,
  Inbox,
  MapPin,
  Receipt,
  Shield,
  Star,
  Tag,
  Users,
  Utensils,
  UtensilsCrossed,
} from 'lucide-react';

export interface NavItem {
  id: string;
  /** Translation key under `admin.layout.sidebar.items.*` (or for overview, `admin.layout.sidebar.overview`). */
  labelKey: string;
  href: string;
  icon: LucideIcon;
  permission?: PermissionKey | PermissionKey[];
  /** Opens in a new tab — for full-screen surfaces like KDS. */
  external?: boolean;
}

export interface NavGroup {
  id: string;
  /** Translation key under `admin.layout.sidebar.groups.*`. */
  labelKey: string;
  items: NavItem[];
}

/**
 * Sidebar navigation — five groups (Operate, Catalog, People, Insights,
 * Configure) per design-prompts README §4. Each item declares the permission
 * key needed to see it; the Sidebar filters via usePermissions().
 *
 * Overview sits outside the grouped section because it's the dashboard root.
 *
 * Labels are translation keys, resolved with next-intl in `sidebar.tsx`.
 */
export const NAV_OVERVIEW: NavItem = {
  id: 'overview',
  labelKey: 'overview',
  href: '/',
  icon: Home,
  permission: 'analytics:read',
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'operate',
    labelKey: 'groups.operate',
    items: [
      {
        id: 'orders',
        labelKey: 'items.orders',
        href: '/orders',
        icon: Receipt,
        permission: 'order:read',
      },
      {
        id: 'kitchen',
        labelKey: 'items.kitchen',
        href: '/kds',
        icon: UtensilsCrossed,
        permission: 'kitchen:read',
        external: true, // opens in new tab — cook full-screens on a tablet
      },
      {
        id: 'reservations',
        labelKey: 'items.reservations',
        href: '/reservations',
        icon: Calendar,
        permission: 'reservation:read',
      },
    ],
  },
  {
    id: 'catalog',
    labelKey: 'groups.catalog',
    items: [
      {
        id: 'menu',
        labelKey: 'items.menu',
        href: '/menu',
        icon: Utensils,
        permission: 'menu:read',
      },
      {
        id: 'promotions',
        labelKey: 'items.promotions',
        href: '/promotions',
        icon: Tag,
        permission: 'promotion:read',
      },
    ],
  },
  {
    id: 'people',
    labelKey: 'groups.people',
    items: [
      {
        id: 'customers',
        labelKey: 'items.customers',
        href: '/customers',
        icon: Users,
        permission: 'customer:read',
      },
      {
        id: 'reviews',
        labelKey: 'items.reviews',
        href: '/reviews',
        icon: Star,
        permission: 'review:read',
      },
      {
        id: 'staff',
        labelKey: 'items.staff',
        href: '/staff',
        icon: Shield,
        permission: 'staff:read',
      },
    ],
  },
  {
    id: 'insights',
    labelKey: 'groups.insights',
    items: [
      {
        id: 'reports',
        labelKey: 'items.reports',
        href: '/reports/exports',
        icon: FileBarChart,
        permission: 'report:read',
      },
      {
        id: 'audit',
        labelKey: 'items.audit',
        href: '/audit-log',
        icon: History,
        permission: 'audit:read',
      },
    ],
  },
  {
    id: 'configure',
    labelKey: 'groups.configure',
    items: [
      {
        id: 'restaurant',
        labelKey: 'items.restaurant',
        href: '/restaurant',
        icon: MapPin,
        permission: 'restaurant:read',
      },
      {
        id: 'contact',
        labelKey: 'items.contact',
        href: '/contact',
        icon: Inbox,
        permission: 'contact:read',
      },
      {
        id: 'settings',
        labelKey: 'items.settings',
        href: '/settings',
        icon: Cog,
        permission: 'settings:read',
      },
    ],
  },
];
