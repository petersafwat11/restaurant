'use client';

import { useRouter } from '@/i18n/navigation';
import { Container, PageSpinner } from '@repo/ui';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

/**
 * Stripe redirect landing — `/checkout/return`.
 *
 * Redirect-based payment methods (BLIK, P24) bounce the browser here after the
 * customer confirms in their bank app. `confirmPayment` appends Stripe's
 * `redirect_status` + `payment_intent` params; we additionally carry `orderId`
 * (set in the return_url) so we can route straight to the confirmation page.
 * The Payment row flips to PAID asynchronously via the Stripe webhook, so the
 * confirmation page may briefly show the order as PENDING — that's expected.
 *
 * Known gap (online payments are still flag-gated off): a *guest* who pays via
 * a redirect method loses the signed tracking token across the bank-app round
 * trip, so the confirmation page can't re-fetch their order. Authed users are
 * unaffected. Revisit when card/BLIK actually ship.
 */
export function CheckoutReturnApp() {
  const t = useTranslations('web.shop.checkout.return');
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get('orderId');
  const redirectStatus = params.get('redirect_status');

  React.useEffect(() => {
    if (!orderId) {
      router.replace('/menu');
      return;
    }
    if (redirectStatus === 'failed') {
      // The payment was declined / abandoned in the bank app — back to checkout.
      router.replace('/checkout');
      return;
    }
    router.replace(`/checkout/success/${orderId}`);
  }, [orderId, redirectStatus, router]);

  return (
    <Container size="narrow" className="py-16">
      <PageSpinner label={t('confirming')} />
    </Container>
  );
}
