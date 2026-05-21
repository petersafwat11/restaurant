'use client';

import { useLogout } from '@/features/auth/hooks';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import {
  Bell,
  Gift,
  LogOut,
  type LucideIcon,
  MapPin,
  Receipt,
  Star,
  User,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

type LabelKey =
  | 'profile'
  | 'orders'
  | 'addresses'
  | 'loyalty'
  | 'referrals'
  | 'reviews'
  | 'notifications';

interface NavItemConfig {
  href: string;
  labelKey: LabelKey;
  icon: LucideIcon;
}

const NAV: NavItemConfig[] = [
  { href: '/account/profile', labelKey: 'profile', icon: User },
  { href: '/account/orders', labelKey: 'orders', icon: Receipt },
  { href: '/account/addresses', labelKey: 'addresses', icon: MapPin },
  { href: '/account/loyalty', labelKey: 'loyalty', icon: Gift },
  { href: '/account/referrals', labelKey: 'referrals', icon: Users },
  { href: '/account/reviews', labelKey: 'reviews', icon: Star },
  { href: '/account/notifications', labelKey: 'notifications', icon: Bell },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/account/profile' && pathname === '/account') return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AccountNav() {
  const t = useTranslations('web.account.layout');
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const logout = useLogout();

  return (
    <aside
      aria-label={t('navAriaLabel')}
      className="flex shrink-0 flex-col gap-1 rounded-card border border-border/[var(--border-alpha)] bg-surface-2 p-3 lg:w-64"
    >
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`group flex h-10 items-center gap-3 rounded-input px-3 text-small transition-colors ${
              active
                ? 'bg-accent/[0.10] font-medium text-fg'
                : 'text-fg-muted hover:bg-surface-warm/40 hover:text-fg'
            }`}
          >
            <Icon size={16} strokeWidth={1.75} />
            <span>{t(`nav.${item.labelKey}`)}</span>
          </Link>
        );
      })}
      <div className="my-1 h-px bg-border/[var(--border-alpha)]" />
      <button
        type="button"
        onClick={async () => {
          await logout.mutateAsync().catch(() => null);
          router.push('/');
        }}
        className="flex h-10 items-center gap-3 rounded-input px-3 text-small text-fg-muted transition-colors hover:bg-surface-warm/40 hover:text-fg"
      >
        <LogOut size={16} strokeWidth={1.75} />
        <span>{t('logout')}</span>
      </button>
    </aside>
  );
}
