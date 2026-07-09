'use client';

import { useRouter } from '@/i18n/navigation';
import { Container, PageSpinner } from '@repo/ui';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

/**
 * eService Hosted Payment Page return landing — `/checkout/return`.
 *
 * After the customer pays on eService, the browser is redirected back here.
 * eService appends its own params (`id` = TRN, `status`, `reference`). The final
 * PAID state arrives asynchronously via the `status_url` webhook, so the
 * confirmation page may briefly show the order as PENDING — that's expected; its
 * realtime tracking flips it to PAID when the notification lands.
 *
 * Guest-token continuity: checkout stashes `{orderId, token}` in localStorage
 * (`checkout:pending`) before the redirect, because the full-page bounce to
 * eService wipes React state. We restore it here and forward the signed token to
 * the confirmation page so a guest (no auth session) can still track their order.
 */
const PENDING_KEY = 'checkout:pending';

export function CheckoutReturnApp() {
  const t = useTranslations('web.shop.checkout.return');
  const router = useRouter();
  const params = useSearchParams();
  // eService reports the outcome via `status`; treat anything explicitly
  // non-success as a return-to-checkout so the customer can retry.
  const status = (params.get('status') ?? '').toUpperCase();
  const failed =
    status === 'DECLINED' || status === 'CANCELLED' || status === 'EXPIRED' || status === 'ERROR';

  React.useEffect(() => {
    let pending: { orderId?: string; token?: string | null } = {};
    try {
      const raw = window.localStorage.getItem(PENDING_KEY);
      if (raw) pending = JSON.parse(raw) as { orderId?: string; token?: string | null };
      window.localStorage.removeItem(PENDING_KEY);
    } catch {
      // localStorage unavailable — fall back to the URL `orderId` param below.
    }
    // orderId is carried reliably on the return URL (the API return endpoint adds
    // it); localStorage is a fallback. The guest token is localStorage-only.
    const orderId = params.get('orderId') ?? pending.orderId ?? undefined;
    const token = pending.token ?? null;

    if (!orderId) {
      router.replace('/menu');
      return;
    }
    if (failed) {
      // Declined / abandoned — back to checkout to retry (the pending order is reusable).
      router.replace('/checkout');
      return;
    }
    const tokenQuery = token ? `?t=${encodeURIComponent(token)}` : '';
    router.replace(`/checkout/success/${orderId}${tokenQuery}`);
  }, [failed, params, router]);

  return (
    <Container size="narrow" className="py-16">
      <PageSpinner label={t('confirming')} />
    </Container>
  );
}
