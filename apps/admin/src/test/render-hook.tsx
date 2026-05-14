import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RenderHookOptions, renderHook as rtlRenderHook } from '@testing-library/react';
import { type ReactNode, useState } from 'react';

export function renderHookWithProviders<TResult, TProps>(
  callback: (props: TProps) => TResult,
  options?: Omit<RenderHookOptions<TProps>, 'wrapper'>,
) {
  function Wrapper({ children }: { children: ReactNode }) {
    const [qc] = useState(
      () =>
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        }),
    );
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }

  return rtlRenderHook(callback, { wrapper: Wrapper, ...options });
}
