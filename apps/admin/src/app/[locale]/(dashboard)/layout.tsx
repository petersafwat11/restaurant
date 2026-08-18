'use client';

import { OrderAlarmBanner } from '@/components/orders/order-alarm-banner';
import { PageHeaderProvider, usePageHeaderConfig } from '@/components/shell/page-title-context';
import { Sidebar } from '@/components/shell/sidebar';
import { Topbar } from '@/components/shell/topbar';
import { usePathname, useRouter } from '@/i18n/navigation';
import { OrderAlarmProvider } from '@/providers/order-alarm-provider';
import { useAuthStore } from '@/stores/auth-store';
import { PageSpinner, Sheet, SheetContent, SheetTitle, TooltipProvider } from '@repo/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';

function Shell({ children }: { children: React.ReactNode }) {
  // Desktop rail collapse (240↔64) — user preference, defaults expanded.
  const [collapsed, setCollapsed] = React.useState(false);
  // Mobile off-canvas nav (below `lg`).
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const cfg = usePageHeaderConfig();
  const pathname = usePathname();
  const t = useTranslations('admin.layout.sidebar');

  // Close the drawer whenever the route changes (tap-to-navigate dismisses it).
  React.useEffect(() => {
    if (pathname) setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Desktop rail — CSS-hidden below `lg`, where the drawer takes over.
          No window.innerWidth listener → no desktop-first hydration flash. */}
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </div>

      {/* Mobile off-canvas drawer — same Sidebar, always expanded. */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" width={264} className="bg-surface p-0 lg:hidden">
          <SheetTitle className="sr-only">{t('ariaLabel')}</SheetTitle>
          <Sidebar
            variant="drawer"
            collapsed={false}
            onToggle={() => undefined}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={cfg.title}
          showDateRange={cfg.showDateRange}
          range={cfg.rangeId ? { id: cfg.rangeId } : undefined}
          onRangeChange={cfg.onRangeChange ? (r) => cfg.onRangeChange?.({ id: r.id }) : undefined}
          rightExtras={cfg.rightExtras}
          onMenuClick={() => setMobileNavOpen(true)}
        />
        <OrderAlarmBanner />
        <main className="mx-auto w-full max-w-page-max flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);

  React.useEffect(() => {
    if (isHydrated && !user) {
      const next = pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${next}`);
    }
  }, [isHydrated, user, router, pathname]);

  if (!isHydrated || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg">
        <PageSpinner minHeightClassName="" />
      </div>
    );
  }
  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={300}>
      <PageHeaderProvider>
        <AuthGate>
          <OrderAlarmProvider>
            <Shell>{children}</Shell>
          </OrderAlarmProvider>
        </AuthGate>
      </PageHeaderProvider>
    </TooltipProvider>
  );
}
