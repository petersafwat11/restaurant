'use client';

import * as React from 'react';

/**
 * Per-page Topbar configuration. Pages call `usePageTitle({ title, … })` to
 * push their config; the DashboardLayout's Topbar reads the latest value.
 * Keeps the Topbar a single sticky element while letting each page customize
 * its title, date range, and any extra controls.
 */
export interface PageHeaderConfig {
  title: string;
  showDateRange?: boolean;
  /** When provided, the Topbar renders a DateRangeSegmented bound to this. */
  rangeId?: 'today' | '7d' | '30d' | 'custom';
  onRangeChange?: (r: { id: 'today' | '7d' | '30d' | 'custom' }) => void;
  rightExtras?: React.ReactNode;
}

interface Ctx {
  config: PageHeaderConfig;
  setConfig: (c: PageHeaderConfig) => void;
}

const PageHeaderContext = React.createContext<Ctx | null>(null);

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = React.useState<PageHeaderConfig>({ title: 'Admin' });
  const value = React.useMemo(() => ({ config, setConfig }), [config]);
  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}

export function usePageHeaderConfig(): PageHeaderConfig {
  const ctx = React.useContext(PageHeaderContext);
  if (!ctx) throw new Error('usePageHeaderConfig must be used inside PageHeaderProvider');
  return ctx.config;
}

/**
 * Pages call this hook to set their Topbar title and (optionally) wire a date
 * range. Updates run inside an effect so React doesn't complain about cross-
 * tree setState during render.
 */
export function usePageHeader(config: PageHeaderConfig): void {
  const ctx = React.useContext(PageHeaderContext);
  if (!ctx) throw new Error('usePageHeader must be used inside PageHeaderProvider');
  const { setConfig } = ctx;

  // Stringify config for stable dep — avoids needing useCallback on caller
  const serialized = JSON.stringify({
    title: config.title,
    showDateRange: config.showDateRange,
    rangeId: config.rangeId,
  });

  React.useEffect(() => {
    setConfig(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, setConfig]);
}
