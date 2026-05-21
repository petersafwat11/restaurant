'use client';

import { useLogout } from '@/features/auth/hooks';
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
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

interface AccountNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: AccountNavItem[] = [
  { href: '/account/profile', label: 'Profile', icon: User },
  { href: '/account/orders', label: 'Orders', icon: Receipt },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin },
  { href: '/account/loyalty', label: 'Loyalty', icon: Gift },
  { href: '/account/referrals', label: 'Referrals', icon: Users },
  { href: '/account/reviews', label: 'Reviews', icon: Star },
  { href: '/account/notifications', label: 'Notifications', icon: Bell },
];

function isActive(pathname: string, href: string): boolean {
  // Treat /account and /account/profile as the same active state.
  if (href === '/account/profile' && pathname === '/account') return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AccountNav() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const logout = useLogout();

  return (
    <aside
      aria-label="Account navigation"
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
            <span>{item.label}</span>
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
        <span>Sign out</span>
      </button>
    </aside>
  );
}
