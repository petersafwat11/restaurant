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
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: PermissionKey | PermissionKey[];
  /** Opens in a new tab — for full-screen surfaces like KDS. */
  external?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

/**
 * Sidebar navigation — five groups (Operate, Catalog, People, Insights,
 * Configure) per design-prompts README §4. Each item declares the permission
 * key needed to see it; the Sidebar filters via usePermissions().
 *
 * Overview sits outside the grouped section because it's the dashboard root.
 */
export const NAV_OVERVIEW: NavItem = {
  id: 'overview',
  label: 'Overview',
  href: '/',
  icon: Home,
  permission: 'analytics:read',
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'operate',
    label: 'Operate',
    items: [
      { id: 'orders', label: 'Orders', href: '/orders', icon: Receipt, permission: 'order:read' },
      {
        id: 'kitchen',
        label: 'Kitchen Display',
        href: '/kds',
        icon: UtensilsCrossed,
        permission: 'kitchen:read',
        external: true, // opens in new tab — cook full-screens on a tablet
      },
      {
        id: 'reservations',
        label: 'Reservations',
        href: '/reservations',
        icon: Calendar,
        permission: 'reservation:read',
      },
    ],
  },
  {
    id: 'catalog',
    label: 'Catalog',
    items: [
      { id: 'menu', label: 'Menu', href: '/menu', icon: Utensils, permission: 'menu:read' },
      {
        id: 'promotions',
        label: 'Promotions',
        href: '/promotions',
        icon: Tag,
        permission: 'promotion:read',
      },
    ],
  },
  {
    id: 'people',
    label: 'People',
    items: [
      {
        id: 'customers',
        label: 'Customers',
        href: '/customers',
        icon: Users,
        permission: 'customer:read',
      },
      { id: 'reviews', label: 'Reviews', href: '/reviews', icon: Star, permission: 'review:read' },
      { id: 'staff', label: 'Staff', href: '/staff', icon: Shield, permission: 'staff:read' },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    items: [
      {
        id: 'reports',
        label: 'Reports',
        href: '/reports/exports',
        icon: FileBarChart,
        permission: 'report:read',
      },
      {
        id: 'audit',
        label: 'Audit log',
        href: '/audit-log',
        icon: History,
        permission: 'audit:read',
      },
    ],
  },
  {
    id: 'configure',
    label: 'Configure',
    items: [
      {
        id: 'restaurant',
        label: 'Restaurant',
        href: '/restaurant',
        icon: MapPin,
        permission: 'restaurant:read',
      },
      {
        id: 'contact',
        label: 'Contact messages',
        href: '/contact',
        icon: Inbox,
        permission: 'contact:read',
      },
      {
        id: 'settings',
        label: 'Settings',
        href: '/settings',
        icon: Cog,
        permission: 'settings:read',
      },
    ],
  },
];
