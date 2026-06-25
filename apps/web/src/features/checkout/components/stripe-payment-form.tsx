'use client';

import { getApiClient } from '@/lib/api-client';
import type { PaymentMethodKind } from '@repo/types';
import { Spinner } from '@repo/ui';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { type Stripe, loadStripe } from '@stripe/stripe-js';
import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

/**
 * Stripe Elements payment form (PaymentElement variant — supports cards, BLIK,
 * Apple Pay / Google Pay surfaced through the same widget when configured in
 * the Stripe dashboard).
 *
 * Only mounted when the `payments.stripe_elements` feature flag is on AND the
 * backend `/payments/config` returns a publishable key. The container component
 * fetches the order's clientSecret on mount via `apiClient.payments.createIntent`.
 *
 * Submission flow: parent calls `submitRef.current()` from its place-order
 * handler — that confirms the intent client-side. Confirmation success → the
 * webhook updates the order; failure → render the error inline.
 */
interface StripePaymentFormProps {
  publishableKey: string;
  orderId: string | null;
  /** Submit handle: the parent calls this; returns null on success, error string on failure. */
  submitRef: React.MutableRefObject<(() => Promise<string | null>) | null>;
  /**
   * Which Stripe method the customer picked. Mostly a label on the intent —
   * `automatic_payment_methods` means the PaymentElement still surfaces every
   * configured method (card, BLIK, P24…) as tabs — but it keeps the recorded
   * Payment.method aligned with the customer's choice. Defaults to card.
   */
  methodKind?: PaymentMethodKind;
  /** Called when the publishable key + clientSecret are both ready. */
  onReady?: () => void;
}

let cachedStripe: Promise<Stripe | null> | null = null;
function getStripe(publishableKey: string): Promise<Stripe | null> {
  if (!cachedStripe) cachedStripe = loadStripe(publishableKey);
  return cachedStripe;
}

export function StripePaymentForm({
  publishableKey,
  orderId,
  submitRef,
  methodKind = 'STRIPE_CARD',
  onReady,
}: StripePaymentFormProps) {
  const t = useTranslations('web.shop.checkout.stripe');
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [intentError, setIntentError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!orderId) return;
    let mounted = true;
    (async () => {
      try {
        const res = await getApiClient().payments.createIntent({
          orderId,
          provider: 'stripe',
          methodKind,
        });
        if (!mounted) return;
        if (!res.clientSecret) {
          setIntentError(t('notConfigured'));
          return;
        }
        setClientSecret(res.clientSecret);
        onReady?.();
      } catch (err) {
        if (!mounted) return;
        setIntentError((err as Error).message || t('initFailed'));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [orderId, onReady, t, methodKind]);

  if (intentError) {
    return (
      <div className="flex items-center gap-2 rounded-card border border-negative/20 bg-negative/10 px-3 py-2 text-small text-negative">
        <AlertCircle size={16} /> <span>{intentError}</span>
      </div>
    );
  }

  if (!orderId) {
    return <p className="text-small text-fg-muted">{t('willAppear')}</p>;
  }

  if (!clientSecret) {
    return (
      <div className="flex items-center gap-2 text-small text-fg-muted">
        <Spinner size="xs" tone="muted" /> {t('preparing')}
      </div>
    );
  }

  return (
    <Elements
      stripe={getStripe(publishableKey)}
      options={{ clientSecret, appearance: { theme: 'stripe' } }}
    >
      <StripeInner submitRef={submitRef} orderId={orderId} />
    </Elements>
  );
}

function StripeInner({
  submitRef,
  orderId,
}: {
  submitRef: React.MutableRefObject<(() => Promise<string | null>) | null>;
  orderId: string | null;
}) {
  const t = useTranslations('web.shop.checkout.stripe');
  const stripe = useStripe();
  const elements = useElements();

  React.useEffect(() => {
    submitRef.current = async () => {
      if (!stripe || !elements) return t('notReady');
      // Methods that need a redirect (e.g. BLIK) bounce the browser to this
      // return_url; carry the orderId so /checkout/return can route to the
      // confirmation page. Card payments resolve inline (no redirect).
      const returnUrl = new URL('/checkout/return', window.location.origin);
      if (orderId) returnUrl.searchParams.set('orderId', orderId);
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl.toString(),
        },
        redirect: 'if_required',
      });
      if (error) return error.message ?? t('declined');
      return null;
    };
    return () => {
      submitRef.current = null;
    };
  }, [stripe, elements, submitRef, t]);

  return (
    <div className="rounded-card border border-border/[var(--border-strong-alpha)] bg-surface-2 p-4">
      <PaymentElement options={{ layout: 'tabs' }} />
    </div>
  );
}
