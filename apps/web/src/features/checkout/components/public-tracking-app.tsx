'use client';

import { usePublicOrderTracking } from '@/features/orders/hooks';
import { Container, EmptyState, OrderProgressStepper, PageSpinner } from '@repo/ui';
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
  const query = usePublicOrderTracking(token);

  if (!token) {
    return (
      <Container size="narrow" className="py-16">
        <EmptyState
          size="lg"
          title="Tracking link required"
          description="This page needs a valid tracking link. Check the link in your confirmation email."
          action={{ label: 'Back to menu', href: '/menu' }}
        />
      </Container>
    );
  }

  if (query.isLoading) {
    return (
      <Container size="narrow" className="py-16">
        <PageSpinner label="Loading order…" />
      </Container>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Container size="narrow" className="py-16">
        <EmptyState
          size="lg"
          title="Tracking link expired or invalid"
          description="This tracking link is no longer valid. If you have an account, sign in to see your order."
          action={{ label: 'Sign in', href: '/login' }}
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
          title="Order not found"
          description="This tracking link doesn't match the order in the URL."
          action={{ label: 'Back to menu', href: '/menu' }}
        />
      </Container>
    );
  }

  return (
    <Container size="narrow" className="py-12">
      <div className="space-y-8">
        <header className="text-center">
          <p className="text-eyebrow uppercase tracking-wider text-fg-subtle">
            Order #{tracking.orderNumber}
          </p>
          <h1 className="font-display text-h2 text-fg">Tracking your order</h1>
          {tracking.etaMinutes !== null && !tracking.isTerminal && (
            <p className="mt-3 text-body text-fg-muted">
              Estimated time: <strong>{tracking.etaMinutes} min</strong>
            </p>
          )}
        </header>

        <OrderProgressStepper mode={tracking.type} status={tracking.status} />

        {tracking.isTerminal && (
          <p className="text-center text-body text-fg-muted">
            This order is complete. Thanks for ordering with us.
          </p>
        )}
      </div>
    </Container>
  );
}
