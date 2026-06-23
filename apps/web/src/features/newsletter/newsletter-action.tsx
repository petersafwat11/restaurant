'use client';

import { Link } from '@/i18n/navigation';
import { getApiClient } from '@/lib/api-client';
import { Container } from '@repo/ui';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

type Status = 'loading' | 'success' | 'error';

/**
 * Handles the double-opt-in confirm / unsubscribe links from the newsletter
 * email. Reads the `token` from the URL and POSTs it to the API on mount
 * (POST — not a prefetchable GET — so email-client link prefetching can't
 * silently confirm/unsubscribe).
 */
export function NewsletterAction({ action }: { action: 'confirm' | 'unsubscribe' }) {
  const t = useTranslations(`web.newsletter.${action}` as 'web.newsletter.confirm');
  const token = useSearchParams().get('token');
  const [status, setStatus] = React.useState<Status>('loading');
  const ranRef = React.useRef(false);

  React.useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    if (!token) {
      setStatus('error');
      return;
    }
    const api = getApiClient();
    const run =
      action === 'confirm' ? api.newsletter.confirm(token) : api.newsletter.unsubscribe(token);
    run.then(() => setStatus('success')).catch(() => setStatus('error'));
  }, [action, token]);

  const title =
    status === 'loading'
      ? t('loadingTitle')
      : status === 'success'
        ? t('successTitle')
        : t('errorTitle');

  return (
    <section className="bg-bg py-section-y-mobile sm:py-section-y">
      <Container>
        <div className="mx-auto flex max-w-[560px] flex-col items-center text-center">
          <h1 className="font-display text-h1 text-fg">{title}</h1>
          {status !== 'loading' && (
            <p className="mt-4 text-body-l text-fg-muted">
              {status === 'success' ? t('successDescription') : t('errorDescription')}
            </p>
          )}
          {status !== 'loading' && (
            <Link
              href="/"
              className="mt-8 inline-flex h-12 items-center rounded-button bg-accent px-6 text-[15px] font-medium text-text-on-accent transition-colors hover:bg-accent-hover"
            >
              {t('backHome')}
            </Link>
          )}
        </div>
      </Container>
    </section>
  );
}
