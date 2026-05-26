'use client';

import { useAddToCart, useCart, useRemoveCartItem, useUpdateCartItem } from '@/features/cart/hooks';
import { cartItemToDisplay } from '@/features/cart/to-display';
import { CartSheet, FloatingCartButton } from '@repo/ui';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

/**
 * Mounted in `(shop)/layout.tsx`. Holds the global CartSheet + FloatingCartButton
 * state and wires both to the cart hooks.
 *
 * Cart state lives in TanStack Query cache (server cart, `useCart`) — the
 * Zustand store only holds in-flight mutation counts. Cart-mutation hooks
 * are responsible for refreshing the cache.
 */
const HIDE_CART_ROUTES = ['/checkout', '/cart'];

export function CartContainer() {
  const [open, setOpen] = React.useState(false);
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
        itemCount === 0
          ? t('empty')
          : `${t('title')} — ${t('itemCount', { count: itemCount })}`,
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
          footerHint: t('footerHint'),
          lineItem: {
            remove: t('remove'),
            notePrefix: t('notePrefix'),
            quantityAriaLabel: (name) => t('quantityAriaLabel', { name }),
          },
        }}
      />
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
