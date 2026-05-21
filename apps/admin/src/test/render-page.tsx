import { PageHeaderProvider } from '@/components/shell/page-title-context';
import { useAuthStore } from '@/stores/auth-store';
import { type MeDto, PERMISSION_KEYS, type PermissionKey } from '@repo/types';
import { TooltipProvider } from '@repo/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RenderOptions, type RenderResult, render } from '@testing-library/react';
import { type ReactElement, type ReactNode, useState } from 'react';

interface PageProvidersProps {
  children: ReactNode;
}

interface RenderPageOptions extends Omit<RenderOptions, 'wrapper'> {
  permissions?: PermissionKey[];
  user?: Partial<MeDto>;
}

/**
 * Seed the auth store with a fully-permissioned owner and render the page
 * inside the provider stack used by the real dashboard layout. Each test gets
 * a fresh QueryClient via state.
 */
export function renderPage(ui: ReactElement, opts: RenderPageOptions = {}): RenderResult {
  const {
    permissions = PERMISSION_KEYS as readonly PermissionKey[] as PermissionKey[],
    user,
    ...rtl
  } = opts;

  useAuthStore.setState({
    user: {
      id: 'u_test',
      email: 'owner@test.local',
      phone: null,
      firstName: 'Test',
      lastName: 'Owner',
      avatarUrl: null,
      locale: 'en',
      emailVerifiedAt: new Date().toISOString(),
      phoneVerifiedAt: null,
      roles: ['owner'],
      permissions,
      ...user,
    },
    isHydrated: true,
  });

  function Wrapper({ children }: PageProvidersProps) {
    const [qc] = useState(
      () =>
        new QueryClient({
          defaultOptions: {
            queries: { retry: false, gcTime: 0, staleTime: 0 },
            mutations: { retry: false },
          },
        }),
    );
    return (
      <QueryClientProvider client={qc}>
        <TooltipProvider delayDuration={0}>
          <PageHeaderProvider>{children}</PageHeaderProvider>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...rtl });
}

export function resetTestState() {
  useAuthStore.setState({ user: null, isHydrated: false });
}
