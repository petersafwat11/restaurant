'use client';

import type { CartDto } from '@repo/types';
import { create } from 'zustand';

/**
 * Cart store — holds the canonical CartDto (from the server) plus a small
 * in-flight mutation counter for "saving…" hints.
 *
 * The cart **session key** used to live here (localStorage-backed). It now
 * lives in a cookie + the <CartSessionProvider> context so SSR can render
 * the cart count without flicker. See apps/web/src/lib/cart-session.ts and
 * apps/web/src/components/cart-session-provider.tsx.
 *
 * The `mergeCartItems` pure reducer stays here — it's a unit-testable
 * function that callers (the login flow) use to plan the server-side merge.
 */
export interface CartState {
  cart: CartDto | null;
  /** Number of in-flight mutations; lets UIs show a subtle "saving…" hint. */
  pendingMutationCount: number;

  setCart: (cart: CartDto | null) => void;
  beginMutation: () => void;
  endMutation: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  pendingMutationCount: 0,

  setCart: (cart) => set({ cart }),
  beginMutation: () => set({ pendingMutationCount: get().pendingMutationCount + 1 }),
  endMutation: () => set({ pendingMutationCount: Math.max(0, get().pendingMutationCount - 1) }),
}));

/**
 * Pure reducer used by the merge-on-login flow + unit-tested directly.
 * Collapses guest items into the existing user cart by (menuItemId, fingerprint).
 */
export interface MergeInput {
  /** Cart items from the user's existing cart (after login). */
  userItems: { menuItemId: string; quantity: number; fingerprint: string }[];
  /** Cart items from the guest cart we're merging in. */
  guestItems: { menuItemId: string; quantity: number; fingerprint: string }[];
}

export function mergeCartItems(input: MergeInput): {
  menuItemId: string;
  quantity: number;
  fingerprint: string;
}[] {
  const merged = new Map<string, { menuItemId: string; quantity: number; fingerprint: string }>();
  const keyFor = (it: { menuItemId: string; fingerprint: string }) =>
    `${it.menuItemId}|${it.fingerprint}`;

  for (const it of input.userItems) {
    merged.set(keyFor(it), { ...it });
  }
  for (const it of input.guestItems) {
    const key = keyFor(it);
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += it.quantity;
    } else {
      merged.set(key, { ...it });
    }
  }
  return Array.from(merged.values());
}
