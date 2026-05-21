'use client';

import { PageHeaderProvider, usePageHeaderConfig } from '@/components/shell/page-title-context';
import { Sidebar } from '@/components/shell/sidebar';
import { Topbar } from '@/components/shell/topbar';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { PageSpinner, TooltipProvider } from '@repo/ui';
import * as React from 'react';

function Shell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const cfg = usePageHeaderConfig();

  React.useEffect(() => {
    function onResize() {
      setCollapsed(window.innerWidth < 1280);
    }
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={cfg.title}
          showDateRange={cfg.showDateRange}
          range={cfg.rangeId ? { id: cfg.rangeId } : undefined}
          onRangeChange={cfg.onRangeChange ? (r) => cfg.onRangeChange?.({ id: r.id }) : undefined}
          rightExtras={cfg.rightExtras}
        />
        <main className="mx-auto w-full max-w-page-max flex-1 px-6 py-6">{children}</main>
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
          <Shell>{children}</Shell>
        </AuthGate>
      </PageHeaderProvider>
    </TooltipProvider>
  );
}
