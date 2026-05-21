'use client';

import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import type { PermissionKey } from '@repo/types';
import { cn } from '@repo/ui';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { NAV_GROUPS, NAV_OVERVIEW, type NavItem } from './nav-config';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
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
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      target={item.external ? '_blank' : undefined}
      rel={item.external ? 'noopener noreferrer' : undefined}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        'group relative flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-admin-fast',
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
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname() ?? '/';
  const { has } = usePermissions();
  const user = useAuthStore((s) => s.user);

  const initials = React.useMemo(() => {
    if (!user) return '?';
    const f = user.firstName?.[0] ?? '';
    const l = user.lastName?.[0] ?? '';
    return (f + l).toUpperCase() || user.email.slice(0, 2).toUpperCase();
  }, [user]);

  const overviewVisible = !NAV_OVERVIEW.permission || has(NAV_OVERVIEW.permission as PermissionKey);

  return (
    <aside
      aria-label="Primary"
      className={cn(
        'sticky top-0 flex h-screen shrink-0 flex-col border-r-hairline bg-surface transition-[width] duration-admin-base ease-admin-out',
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar',
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'flex h-topbar items-center gap-3 border-b-hairline px-4',
          collapsed && 'justify-center px-0',
        )}
      >
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent/[0.12] text-xs font-semibold text-accent">
          TK
        </div>
        {!collapsed && <div className="truncate text-sm font-semibold text-fg">Test Kitchen</div>}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {overviewVisible && (
          <div className="mb-3">
            <NavRow
              item={NAV_OVERVIEW}
              active={isItemActive(pathname, NAV_OVERVIEW.href)}
              collapsed={collapsed}
            />
          </div>
        )}
        {NAV_GROUPS.map((group) => {
          const items = visibleItems(group.items, has);
          if (items.length === 0) return null;
          return (
            <div key={group.id} className="mb-3">
              {!collapsed && (
                <div className="px-3 pb-1.5 text-caption-admin text-fg-subtle">{group.label}</div>
              )}
              <div className="flex flex-col gap-0.5">
                {items.map((it) => (
                  <NavRow
                    key={it.id}
                    item={it}
                    active={isItemActive(pathname, it.href)}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer: user identity + collapse toggle */}
      <div
        className={cn(
          'flex items-center gap-3 border-t-hairline px-3 py-3',
          collapsed && 'flex-col gap-2 px-0',
        )}
      >
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-fg">
          {initials}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm text-fg">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="truncate text-xs text-fg-subtle">{user?.roles?.[0] ?? '—'}</div>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="grid h-7 w-7 place-items-center rounded-md text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
        >
          {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
        </button>
      </div>
    </aside>
  );
}
