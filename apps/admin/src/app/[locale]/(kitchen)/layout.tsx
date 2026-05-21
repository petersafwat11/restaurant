'use client';

import { useAuthStore } from '@/stores/auth-store';
import { PageSpinner, TooltipProvider } from '@repo/ui';
import { useRouter } from 'next/navigation';
import * as React from 'react';

/**
 * Kitchen route group — full-screen micro-app with no admin sidebar or topbar.
 * Tablet-mounted, glanceable from 2 meters, optimized for finger taps and zero
 * navigation away during service. Reuses the same auth store.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);

  React.useEffect(() => {
    if (isHydrated && !user) {
      router.replace('/login?next=/kds');
    }
  }, [isHydrated, user, router]);

  if (!isHydrated || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg">
        <PageSpinner minHeightClassName="" />
      </div>
    );
  }
  return <>{children}</>;
}

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={300}>
      <AuthGate>
        <div className="min-h-screen bg-bg text-fg">{children}</div>
      </AuthGate>
    </TooltipProvider>
  );
}
