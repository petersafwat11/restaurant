'use client';

import type { CartDto } from '@repo/types';
import { create } from 'zustand';

const SESSION_KEY_STORAGE = 'cart.sessionKey';

function readOrCreateSessionKey(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  const existing = window.localStorage.getItem(SESSION_KEY_STORAGE);
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  window.localStorage.setItem(SESSION_KEY_STORAGE, fresh);
  return fresh;
}

function clearSessionKey(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SESSION_KEY_STORAGE);
}

export interface CartState {
  cart: CartDto | null;
  /** Number of in-flight mutations; lets UIs show a subtle "saving…" hint. */
  pendingMutationCount: number;

  /** Lazily-initialised session key for guest carts. */
  getSessionKey: () => string;
  /** Called after merge succeeds to drop the guest session key. */
  clearSessionKey: () => void;

  setCart: (cart: CartDto | null) => void;
  beginMutation: () => void;
  endMutation: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  pendingMutationCount: 0,

  getSessionKey: () => readOrCreateSessionKey(),
  clearSessionKey,

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
