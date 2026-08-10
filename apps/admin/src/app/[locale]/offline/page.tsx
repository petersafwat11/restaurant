'use client';

import { Button } from '@repo/ui';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function OfflinePage() {
  const t = useTranslations('admin.settings.general.pwa.offline');

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-5 py-12">
      <section className="w-[calc(100vw-2.5rem)] max-w-lg rounded-card border border-border/[var(--border-alpha)] bg-surface p-6 shadow-2xl shadow-black/20 sm:p-8">
        <div className="mb-7 flex items-center" aria-hidden="true">
          <span className="h-px flex-1 bg-border/[var(--border-strong-alpha)]" />
          <span className="grid h-14 w-14 place-items-center rounded-full border border-negative/30 bg-negative/10 text-negative">
            <WifiOff className="h-6 w-6" />
          </span>
          <span className="h-px flex-1 bg-border/[var(--border-strong-alpha)]" />
        </div>

        <div className="mx-auto max-w-sm text-center">
          <p className="text-caption-admin uppercase tracking-[0.16em] text-accent">
            {t('eyebrow')}
          </p>
          <h1 className="mt-2 text-h1-admin text-fg">{t('title')}</h1>
          <p className="mt-3 text-small leading-6 text-fg-muted">{t('description')}</p>
          <Button
            type="button"
            variant="primary"
            className="mt-6"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4" />
            {t('retry')}
          </Button>
          <p className="mt-4 text-caption-admin text-fg-subtle">{t('safety')}</p>
        </div>
      </section>
    </main>
  );
}
