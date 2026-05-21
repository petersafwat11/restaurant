'use client';

import { useRealtimeStatus } from '@/features/orders/hooks';
import { useAuthStore } from '@/stores/auth-store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@repo/ui';
import { Bell, Cog, LogOut, Search, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { type DateRange, DateRangeSegmented } from './date-range-segmented';

export interface TopbarProps {
  title: string;
  showDateRange?: boolean;
  range?: DateRange;
  onRangeChange?: (r: DateRange) => void;
  /** Extra controls injected on the left side, after the date range. */
  leftExtras?: React.ReactNode;
  /** Replaces the default right cluster (search/bell/cog/avatar). */
  rightExtras?: React.ReactNode;
}

/**
 * Sticky 56px topbar. Slots: title · restaurant switcher · date range ·
 * left-extras · spacer · right-extras (default = search/bell/cog/avatar).
 * The search button opens the ⌘K command palette — wired in Phase 1.
 */
export function Topbar({
  title,
  showDateRange = false,
  range,
  onRangeChange,
  leftExtras,
  rightExtras,
}: TopbarProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  async function onLogout() {
    await clearSession();
    router.push('/login');
  }

  const initials = React.useMemo(() => {
    if (!user) return '?';
    const f = user.firstName?.[0] ?? '';
    const l = user.lastName?.[0] ?? '';
    return (f + l).toUpperCase() || user.email.slice(0, 2).toUpperCase();
  }, [user]);

  return (
    <header
      role="banner"
      className="sticky top-0 z-40 flex h-topbar items-center gap-4 border-b-hairline bg-bg/80 px-6 backdrop-blur"
    >
      <h1 className="text-h1-admin text-fg">{title}</h1>

      {showDateRange && range && onRangeChange && (
        <DateRangeSegmented value={range} onChange={onRangeChange} />
      )}

      {leftExtras}

      <div className="flex-1" />

      {rightExtras ?? (
        <>
          <button
            type="button"
            aria-label="Search (Cmd+K)"
            // TODO(Phase 1): open command palette
            className="flex h-8 items-center gap-2 rounded-md border-hairline-strong bg-surface px-3 text-xs text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <Search size={13} />
            <span className="hidden xl:inline">Search orders, customers, items…</span>
            <kbd className="ml-2 hidden rounded border-hairline-strong bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle xl:inline">
              ⌘K
            </kbd>
          </button>

          <RealtimeStatusBellButton />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Account"
                className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-[11px] font-semibold text-fg transition-colors hover:bg-surface"
              >
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-xs">
                <div className="truncate text-fg">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="truncate text-fg-subtle">{user?.email}</div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push('/settings/hours')}>
                <User size={14} className="text-fg-subtle" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push('/settings')}>
                <Cog size={14} className="text-fg-subtle" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onLogout} className="text-negative focus:text-negative">
                <LogOut size={14} />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </header>
  );
}

const STATUS_DOT_CLS: Record<string, string> = {
  connected: 'bg-positive',
  connecting: 'bg-warning',
  idle: 'bg-warning',
  disconnected: 'bg-negative',
};

const STATUS_LABEL: Record<string, string> = {
  connected: 'Realtime connected',
  connecting: 'Connecting to realtime…',
  idle: 'Realtime idle',
  disconnected: 'Realtime disconnected',
};

function RealtimeStatusBellButton() {
  const status = useRealtimeStatus();
  const dotCls = STATUS_DOT_CLS[status] ?? 'bg-fg-subtle';
  const label = STATUS_LABEL[status] ?? 'Realtime status unknown';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications · ${label}`}
          className={cn(
            'relative grid h-8 w-8 place-items-center rounded-md text-fg-muted transition-colors',
            'hover:bg-surface-2 hover:text-fg',
          )}
        >
          <Bell size={16} />
          <span
            aria-hidden
            className={cn('absolute right-1 top-1 h-1.5 w-1.5 rounded-full ring-2 ring-bg', dotCls)}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
