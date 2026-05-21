'use client';

import { type ReactNode, createContext, useContext, useEffect, useState } from 'react';

/**
 * Cart session context — distributes the `cart_session` cookie value to client
 * hooks (useCart, useAddToCart, …) without each hook reading cookies on its own.
 *
 * Seeding:
 *  - The `(shop)/layout.tsx` server component reads the cookie via
 *    `getCartSessionKey()` and passes the value (string | null) as `initial`.
 *  - If `initial` is null on first paint, this provider POSTs to
 *    `/api/cart-session` once to mint a key. The server sets the cookie so
 *    subsequent SSR has it.
 *  - On login success the merge flow calls `DELETE /api/cart-session`; the
 *    provider's `clear()` resets state to null.
 */

interface CartSessionContextValue {
  /** Current session key, or null while bootstrapping. */
  sessionKey: string | null;
  /** Drop the local key after a successful guest→user merge. */
  clear: () => void;
}

const CartSessionContext = createContext<CartSessionContextValue | null>(null);

export interface CartSessionProviderProps {
  /** Server-seeded value from the `cart_session` cookie, or null for guest first visit. */
  initial: string | null;
  children: ReactNode;
}

export function CartSessionProvider({ initial, children }: CartSessionProviderProps) {
  const [sessionKey, setSessionKey] = useState<string | null>(initial);

  useEffect(() => {
    if (sessionKey !== null) return;
    // First visit — mint a key. Errors are non-fatal: the cart hooks just
    // skip the sessionKey query param, which the API treats as anonymous
    // (returns an empty cart). The user can still browse; cart actions will
    // retry the bootstrap on next interaction.
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/cart-session', { method: 'POST' });
        if (!res.ok) return;
        const data = (await res.json()) as { sessionKey: string };
        if (!cancelled) setSessionKey(data.sessionKey);
      } catch {
        // Swallow — non-fatal.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionKey]);

  const value: CartSessionContextValue = {
    sessionKey,
    clear: () => setSessionKey(null),
  };

  return <CartSessionContext.Provider value={value}>{children}</CartSessionContext.Provider>;
}

/**
 * Read the cart session key for the current request. Returns null while the
 * key is being minted on first visit — cart hooks should pass `enabled: !!key`
 * to TanStack Query so they don't fire with a missing key.
 */
export function useCartSessionKey(): string | null {
  const ctx = useContext(CartSessionContext);
  if (ctx === null) {
    // Not wrapped — return null so the page renders without crashing. This
    // happens on non-(shop) routes that don't need cart state.
    return null;
  }
  return ctx.sessionKey;
}

/** Clear the local session-key state (used by the merge-on-login flow). */
export function useClearCartSession(): () => void {
  const ctx = useContext(CartSessionContext);
  return ctx?.clear ?? (() => {});
}
