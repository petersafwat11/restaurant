'use client';

import { LanguageSwitcher } from '@/components/language-switcher';
import { useLogout } from '@/features/auth/hooks';
import { useRealtimeStatus } from '@/features/orders/hooks';
import { useRouter } from '@/i18n/navigation';
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
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { type DateRange, DateRangeSegmented } from './date-range-segmented';

export interface TopbarProps {
  title: string;
  showDateRange?: boolean;
  range?: DateRange;
  onRangeChange?: (r: DateRange) => void;
  leftExtras?: React.ReactNode;
  rightExtras?: React.ReactNode;
}

export function Topbar({
  title,
  showDateRange = false,
  range,
  onRangeChange,
  leftExtras,
  rightExtras,
}: TopbarProps) {
  const t = useTranslations('admin.layout.topbar');
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  async function onLogout() {
    await logout.mutateAsync();
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
            aria-label={t('searchAriaLabel')}
            className="flex h-8 items-center gap-2 rounded-md border-hairline-strong bg-surface px-3 text-xs text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <Search size={13} />
            <span className="hidden xl:inline">{t('searchPlaceholder')}</span>
            <kbd className="ml-2 hidden rounded border-hairline-strong bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle xl:inline">
              ⌘K
            </kbd>
          </button>

          <RealtimeStatusBellButton />

          <LanguageSwitcher />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t('accountAriaLabel')}
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
                {t('profile')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push('/settings')}>
                <Cog size={14} className="text-fg-subtle" />
                {t('settings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onLogout} className="text-negative focus:text-negative">
                <LogOut size={14} />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </header>
  );
}

function RealtimeStatusBellButton() {
  const t = useTranslations('admin.layout.topbar.realtime');
  const tNotifications = useTranslations('admin.layout.topbar');
  const status = useRealtimeStatus();
  const dotCls =
    status === 'connected'
      ? 'bg-positive'
      : status === 'connecting' || status === 'idle'
        ? 'bg-warning'
        : status === 'disconnected'
          ? 'bg-negative'
          : 'bg-fg-subtle';
  const labelKey =
    status === 'connected' ||
    status === 'connecting' ||
    status === 'idle' ||
    status === 'disconnected'
      ? status
      : 'unknown';
  const label = t(labelKey);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`${tNotifications('notificationsAriaLabel')} · ${label}`}
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
