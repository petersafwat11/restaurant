'use client';

import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { Link, usePathname } from '@/i18n/navigation';
import { getApiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { type PermissionKey, type RestaurantPublicDto, STAFF_ROLE_KEYS } from '@repo/types';
import { cn } from '@repo/ui';
import { useQuery } from '@tanstack/react-query';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { NAV_GROUPS, NAV_OVERVIEW, type NavItem } from './nav-config';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  /**
   * `fixed` — the sticky desktop rail (collapsible 240↔64px).
   * `drawer` — rendered inside the mobile off-canvas Sheet: always expanded,
   * full-width, no sticky/border, and taps close the drawer via `onNavigate`.
   */
  variant?: 'fixed' | 'drawer';
  onNavigate?: () => void;
}

function isItemActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function visibleItems(items: NavItem[], hasPermission: (k: PermissionKey) => boolean): NavItem[] {
  return items.filter((it) => {
    if (!it.permission) return true;
    const keys = Array.isArray(it.permission) ? it.permission : [it.permission];
    return keys.some((k) => hasPermission(k));
  });
}

function NavRow({
  item,
  active,
  collapsed,
  label,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  label: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      target={item.external ? '_blank' : undefined}
      rel={item.external ? 'noopener noreferrer' : undefined}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
      onClick={onNavigate}
      className={cn(
        'group relative flex items-center gap-3 rounded-md px-3 text-sm transition-colors duration-admin-fast',
        // Taller touch targets in the mobile drawer; compact on the desktop rail.
        collapsed ? 'h-9' : 'h-10 sm:h-9',
        active ? 'bg-accent/[0.10] text-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
        collapsed && 'justify-center px-0',
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent"
        />
      )}
      <Icon size={16} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

export function Sidebar({
  collapsed: collapsedProp,
  onToggle,
  variant = 'fixed',
  onNavigate,
}: SidebarProps) {
  const isDrawer = variant === 'drawer';
  // The drawer is always fully expanded — collapsing only applies to the rail.
  const collapsed = isDrawer ? false : collapsedProp;
  const pathname = usePathname() ?? '/';
  const { has } = usePermissions();
  const user = useAuthStore((s) => s.user);
  const t = useTranslations('admin.layout.sidebar');
  const tRoles = useTranslations('admin.staff.roles');
  const restaurantQuery = useQuery<RestaurantPublicDto>({
    queryKey: ['restaurant', 'public'],
    queryFn: () => getApiClient().restaurant.get(),
    staleTime: 5 * 60_000,
  });

  const overviewVisible = !NAV_OVERVIEW.permission || has(NAV_OVERVIEW.permission as PermissionKey);
  const brandName = restaurantQuery.data?.name.trim() || t('brandFallback');
  const brandInitials = brandName
    .split(/\s+/)
    .map((word) => word[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const role = user?.roles?.[0];
  const roleLabel =
    role && STAFF_ROLE_KEYS.includes(role as (typeof STAFF_ROLE_KEYS)[number])
      ? tRoles(role as (typeof STAFF_ROLE_KEYS)[number])
      : (role ?? '—');

  return (
    <aside
      aria-label={t('ariaLabel')}
      className={cn(
        'flex flex-col bg-surface',
        // Inside the mobile Sheet: fill the drawer, no sticky/border.
        isDrawer && 'h-full w-full',
        // Desktop rail: sticky, collapsible, hairline divider.
        !isDrawer &&
          'sticky top-0 h-screen shrink-0 border-r-hairline transition-[width] duration-admin-base ease-admin-out',
        !isDrawer && (collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'),
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'flex h-topbar items-center gap-3 border-b-hairline px-4',
          collapsed && 'justify-center px-0',
        )}
      >
        <div
          aria-hidden
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent/[0.12] text-xs font-semibold text-accent"
        >
          {brandInitials || 'TK'}
        </div>
        {!collapsed && <div className="truncate text-sm font-semibold text-fg">{brandName}</div>}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {overviewVisible && (
          <div className="mb-3">
            <NavRow
              item={NAV_OVERVIEW}
              active={isItemActive(pathname, NAV_OVERVIEW.href)}
              collapsed={collapsed}
              label={t(NAV_OVERVIEW.labelKey)}
              onNavigate={onNavigate}
            />
          </div>
        )}
        {NAV_GROUPS.map((group) => {
          const items = visibleItems(group.items, has);
          if (items.length === 0) return null;
          return (
            <div key={group.id} className="mb-3">
              {!collapsed && (
                <div className="px-3 pb-1.5 text-caption-admin text-fg-subtle">
                  {t(group.labelKey)}
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                {items.map((it) => (
                  <NavRow
                    key={it.id}
                    item={it}
                    active={isItemActive(pathname, it.href)}
                    collapsed={collapsed}
                    label={t(it.labelKey)}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer: role + collapse toggle. Personal identity stays in the account menu. */}
      <div
        className={cn(
          'flex items-center gap-3 border-t-hairline px-3 py-3',
          collapsed && 'justify-center px-0',
        )}
      >
        {!collapsed && (
          <div className="min-w-0 flex-1 truncate text-xs font-medium text-fg-muted">
            {roleLabel}
          </div>
        )}
        {!isDrawer && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? t('expand') : t('collapse')}
            className="grid h-7 w-7 place-items-center rounded-md text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
          >
            {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
          </button>
        )}
      </div>
    </aside>
  );
}
