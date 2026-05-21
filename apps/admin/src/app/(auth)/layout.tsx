'use client';

import { safeNext } from '@/lib/safe-next';
import { useAuthStore } from '@/stores/auth-store';
import { PageSpinner } from '@repo/ui';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useSearchParams();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);

  React.useEffect(() => {
    if (isHydrated && user) {
      router.replace(safeNext(params.get('next')));
    }
  }, [isHydrated, user, router, params]);

  if (isHydrated && user) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg text-small-admin text-fg-muted">
        Redirecting…
      </div>
    );
  }
  return <>{children}</>;
}

function Wordmark() {
  return (
    <div className="flex items-center justify-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-md bg-accent text-bg shadow-card">
        <svg
          role="img"
          aria-label="Restaurant Admin logo"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <title>Restaurant Admin</title>
          <path d="M4 4h6v6H4z" />
          <path d="M14 4h6v6h-6z" />
          <path d="M4 14h6v6H4z" />
          <path d="M14 14h6v6h-6z" />
        </svg>
      </div>
      <span className="text-xl font-semibold tracking-tight text-fg">
        Restaurant <span className="text-accent">Admin</span>
      </span>
    </div>
  );
}

function AuthLayoutInner({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="relative min-h-screen overflow-hidden bg-bg">
        <Image src="/auth-cover.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-bg/95 via-bg/80 to-bg/95"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(at_center,rgb(var(--accent)/0.08),transparent_70%)]"
        />

        <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-[420px] space-y-6">
            <Wordmark />
            {children}
          </div>
        </div>
      </div>
    </AuthGate>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-bg">
          <PageSpinner minHeightClassName="" />
        </div>
      }
    >
      <AuthLayoutInner>{children}</AuthLayoutInner>
    </React.Suspense>
  );
}
