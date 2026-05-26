'use client';

import { usePublicOrderTracking } from '@/features/orders/hooks';
import { Container, EmptyState, OrderProgressStepper, PageSpinner } from '@repo/ui';
import type { OrderType } from '@repo/types';
import { useTranslations } from 'next-intl';
import * as React from 'react';

interface PublicTrackingAppProps {
  orderId: string;
  token: string | null | undefined;
}

/**
 * Strict-subset public tracking view shown via signed email links.
 * Shows status stepper, ETA, and a partial address — never the cart lines or
 * re-order button (those require authenticated context).
 */
export function PublicTrackingApp({ orderId, token }: PublicTrackingAppProps) {
  const t = useTranslations('web.public.track');
  const tStepper = useTranslations('shared.orderTracking');
  const query = usePublicOrderTracking(token);

  if (!token) {
    return (
      <Container size="narrow" className="py-16">
        <EmptyState
          size="lg"
          title={t('requireLink.title')}
          description={t('requireLink.description')}
          action={{ label: t('requireLink.action'), href: '/menu' }}
        />
      </Container>
    );
  }

  if (query.isLoading) {
    return (
      <Container size="narrow" className="py-16">
        <PageSpinner label={t('loading')} />
      </Container>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Container size="narrow" className="py-16">
        <EmptyState
          size="lg"
          title={t('invalidLink.title')}
          description={t('invalidLink.description')}
          action={{ label: t('invalidLink.action'), href: '/login' }}
        />
      </Container>
    );
  }

  const tracking = query.data;
  if (tracking.orderId !== orderId) {
    // Mismatched token vs URL — treat as not found rather than honoring the token.
    return (
      <Container size="narrow" className="py-16">
        <EmptyState
          size="lg"
          title={t('mismatch.title')}
          description={t('mismatch.description')}
          action={{ label: t('mismatch.action'), href: '/menu' }}
        />
      </Container>
    );
  }

  const stepsByMode: Record<OrderType, string[]> = {
    DELIVERY: [tStepper('step.confirmed'), tStepper('step.preparing'), tStepper('step.onTheWay'), tStepper('step.delivered')],
    PICKUP: [tStepper('step.confirmed'), tStepper('step.preparing'), tStepper('step.readyForPickup'), tStepper('step.pickedUp')],
    DINE_IN: [tStepper('step.confirmed'), tStepper('step.preparing'), tStepper('step.served')],
  };

  return (
    <Container size="narrow" className="py-12">
      <div className="space-y-8">
        <header className="text-center">
          <p className="text-eyebrow uppercase tracking-wider text-fg-subtle">
            {t('hero.orderNumber', { number: tracking.orderNumber })}
          </p>
          <h1 className="font-display text-h2 text-fg">{t('hero.title')}</h1>
          {tracking.etaMinutes !== null && !tracking.isTerminal && (
            <p className="mt-3 text-body text-fg-muted">
              {t.rich('hero.eta', {
                minutes: tracking.etaMinutes,
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
          )}
        </header>

        <OrderProgressStepper
          mode={tracking.type}
          status={tracking.status}
          steps={stepsByMode[tracking.type]}
          cancelledLabel={tStepper('cancelled')}
          refundedLabel={tStepper('refunded')}
          ariaLabel={tStepper('ariaLabel')}
        />

        {tracking.isTerminal && (
          <p className="text-center text-body text-fg-muted">{t('terminal')}</p>
        )}
      </div>
    </Container>
  );
}
