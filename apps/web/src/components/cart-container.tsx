'use client';

import { useAddToCart, useCart, useRemoveCartItem, useUpdateCartItem } from '@/features/cart/hooks';
import { deliveryMinimum } from '@/features/cart/lib/delivery-minimum';
import { cartItemToDisplay } from '@/features/cart/to-display';
import { useRestaurant } from '@/features/restaurants/hooks/use-restaurant';
import { usePathname, useRouter } from '@/i18n/navigation';
import { registerCartDrawer } from '@/lib/cart-drawer';
import { FloatingCartButton } from '@repo/ui';
import { formatMoney } from '@repo/utils';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import * as React from 'react';

/**
 * Mounted in `(shop)/layout.tsx`. Holds the global CartSheet + FloatingCartButton
 * state and wires both to the cart hooks.
 *
 * Cart state lives in TanStack Query cache (server cart, `useCart`) — the
 * Zustand store only holds in-flight mutation counts. Cart-mutation hooks
 * are responsible for refreshing the cache.
 */
// The drawer (Radix Dialog) is code-split and mounted on first open; the
// floating button stays in the initial bundle.
const CartSheet = dynamic(() => import('@repo/ui').then((m) => m.CartSheet), { ssr: false });

const HIDE_CART_ROUTES = ['/checkout', '/cart'];

export function CartContainer() {
  const [open, setOpen] = React.useState(false);
  const [sheetLoaded, setSheetLoaded] = React.useState(false);
  React.useEffect(() => {
    if (open) setSheetLoaded(true);
  }, [open]);
  // Header cart icon → open this drawer.
  React.useEffect(() => registerCartDrawer(() => setOpen(true)), []);
  const [notes, setNotes] = React.useState('');
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const t = useTranslations('web.shop.cart');

  const cartQuery = useCart();
  const updateMutation = useUpdateCartItem();
  const removeMutation = useRemoveCartItem();
  // useAddToCart isn't used here directly — pages call it when the user
  // adds something. We import it so it's covered by Phase 2.2 wiring.
  void useAddToCart;

  const cart = cartQuery.data;
  const lines = (cart?.items ?? []).map((i) => cartItemToDisplay(i));
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
  const subtotal = cart?.totals.subtotal ?? '0.00';
  const currency = cart?.currency ?? 'PLN';
  const restaurant = useRestaurant().data;
  // Most abandoned checkouts were single items under the delivery minimum —
  // say so in the cart and point to pickup / cheap add-ons instead.
  const minimum = deliveryMinimum(
    subtotal,
    restaurant?.minOrderAmount,
    restaurant?.acceptsDelivery ?? true,
  );

  // Screen-reader announcement of cart-count changes. The first render is
  // skipped (no prior count to compare against), then a polite live region
  // emits a short summary whenever the count flips.
  const lastCountRef = React.useRef<number | null>(null);
  const [announcement, setAnnouncement] = React.useState('');
  React.useEffect(() => {
    if (lastCountRef.current === null) {
      lastCountRef.current = itemCount;
      return;
    }
    if (lastCountRef.current !== itemCount) {
      lastCountRef.current = itemCount;
      setAnnouncement(
        itemCount === 0 ? t('empty') : `${t('title')} — ${t('itemCount', { count: itemCount })}`,
      );
    }
  }, [itemCount, t]);

  const hideFloating = HIDE_CART_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const onCheckout = () => {
    setOpen(false);
    router.push('/checkout');
  };

  return (
    <>
      {sheetLoaded && (
        <CartSheet
          open={open}
          onOpenChange={setOpen}
          lines={lines}
          onUpdateQty={(id, qty) =>
            updateMutation.mutate({ cartItemId: id, input: { quantity: qty } })
          }
          onRemove={(id) => removeMutation.mutate({ cartItemId: id })}
          onCheckout={onCheckout}
          subtotal={subtotal}
          currency={currency}
          notes={{
            value: notes,
            onChange: setNotes,
            placeholder: t('notesPlaceholder'),
          }}
          emptyAction={{
            label: t('browseMenu'),
            onClick: () => {
              setOpen(false);
              router.push('/menu');
            },
          }}
          labels={{
            title: t('title'),
            closeAriaLabel: t('closeAriaLabel'),
            formatItemCount: (count) => `(${t('itemCount', { count })})`,
            emptyTitle: t('empty'),
            emptyDescription: t('emptyDescription'),
            emptyActionLabel: t('browseMenu'),
            notesLabel: t('notesLabel'),
            notesPlaceholder: t('notesPlaceholder'),
            subtotal: t('subtotal'),
            delivery: t('delivery'),
            deliveryValue: t('deliveryCalculated'),
            total: t('total'),
            checkoutCta: (total) => t('checkoutCta', { total }),
            footerHint:
              itemCount > 0 && minimum.belowMinimum ? (
                <span className="flex flex-col items-center gap-1.5 text-fg">
                  <span>
                    {t('belowMinimum', {
                      missing: formatMoney(minimum.missing, currency),
                      minimum: formatMoney(minimum.minimum, currency),
                    })}
                  </span>
                  <button
                    type="button"
                    className="font-semibold text-accent underline underline-offset-2"
                    onClick={() => {
                      setOpen(false);
                      router.push('/menu/dodatki');
                    }}
                  >
                    {t('addMore')} →
                  </button>
                </span>
              ) : (
                t('footerHint')
              ),
            lineItem: {
              remove: t('remove'),
              notePrefix: t('notePrefix'),
              quantityAriaLabel: (name) => t('quantityAriaLabel', { name }),
            },
          }}
        />
      )}
      <FloatingCartButton
        itemCount={itemCount}
        total={subtotal}
        currency={currency}
        onClick={() => setOpen(true)}
        position="br"
        hidden={hideFloating}
      />
      <output aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </output>
    </>
  );
}
