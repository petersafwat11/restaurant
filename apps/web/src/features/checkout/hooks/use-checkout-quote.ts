'use client';

import { useCartSessionKey } from '@/components/cart-session-provider';
import { getApiClient } from '@/lib/api-client';
import type { CheckoutQuoteDto, OrderType } from '@repo/types';
import { useQuery } from '@tanstack/react-query';

/**
 * Server-authoritative checkout price quote. The server computes every money
 * value (subtotal, coupon/loyalty discount, delivery, tax, tip, grand total)
 * with the same calculator order creation uses — the checkout summary displays
 * these strings verbatim and never recomputes chargeable money on the client.
 *
 * Re-quotes whenever the order type, tip, or `cartVersion` (cart.updatedAt —
 * bumped on item/coupon/loyalty changes) changes.
 */
export function useCheckoutQuote(params: {
  orderType: OrderType;
  tipAmount: string;
  cartVersion: string;
  enabled: boolean;
}) {
  const sessionKey = useCartSessionKey();
  return useQuery<CheckoutQuoteDto>({
    queryKey: [
      'checkout-quote',
      params.orderType,
      params.tipAmount,
      params.cartVersion,
      sessionKey ?? null,
    ],
    queryFn: () =>
      getApiClient().orders.quote({
        type: params.orderType,
        tipAmount: params.tipAmount || '0',
        ...(sessionKey ? { sessionKey } : {}),
      }),
    enabled: params.enabled,
    staleTime: 0,
  });
}
