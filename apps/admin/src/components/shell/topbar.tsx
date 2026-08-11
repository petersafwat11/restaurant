'use client';

import { LanguageSwitcher } from '@/components/language-switcher';
import { useLogout } from '@/features/auth/hooks';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from '@repo/ui';
import { Cog, LogOut, Menu, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { type DateRange, DateRangeSegmented } from './date-range-segmented';
import { NotificationCenter } from './notification-center';

export interface TopbarProps {
  title: string;
  showDateRange?: boolean;
  range?: DateRange;
  onRangeChange?: (r: DateRange) => void;
  leftExtras?: React.ReactNode;
  rightExtras?: React.ReactNode;
  /** Opens the mobile navigation drawer. When set, a hamburger shows below `lg`. */
  onMenuClick?: () => void;
}

export function Topbar({
  title,
  showDateRange = false,
  range,
  onRangeChange,
  leftExtras,
  rightExtras,
  onMenuClick,
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
    <header className="sticky top-0 z-40 flex h-topbar items-center gap-2 border-b-hairline bg-bg/80 px-4 backdrop-blur sm:gap-4 sm:px-6">
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          aria-label={t('openMenuAriaLabel')}
          className="-ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg lg:hidden"
        >
          <Menu size={18} />
        </button>
      )}
      {/* When the date-range shares the bar (Overview), drop the title on phones
          so the range control isn't squeezed to a one-letter title. */}
      <h1
        className={cn('min-w-0 truncate text-h1-admin text-fg', showDateRange && 'hidden sm:block')}
      >
        {title}
      </h1>

      {showDateRange && range && onRangeChange && (
        <DateRangeSegmented value={range} onChange={onRangeChange} />
      )}

      {leftExtras}

      <div className="flex-1" />

      {rightExtras}

      <NotificationCenter userId={user?.id} />

      <div className="hidden sm:block">
        <LanguageSwitcher />
      </div>

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
    </header>
  );
}
