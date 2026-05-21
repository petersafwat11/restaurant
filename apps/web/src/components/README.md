# Components

Web-app-local components that are **not** generic primitives — typically
brand assets, route-spanning containers, and provider wrappers.

Generic primitives live in `@repo/ui` and are shared with admin. Per-screen
components live in `src/features/<feature>/components/`.

Inventory:
- `logo.tsx` — Szef Donald hexagonal copper logo + wordmark.
- `cart-button.tsx` — shopping-bag icon + count bubble (used in `SiteNav`).
- `language-switcher.tsx` — PL|EN pill (mock state for v1).
- `site-chrome.tsx` — wraps `SiteNav` with scroll-state hook (added during
  Phase 1.1 alongside the primitive).
- `cart-container.tsx` — global `CartSheet` + `FloatingCartButton`, mounted
  in `(shop)/layout.tsx` (added during Phase 1.2 alongside the primitives).
- `toaster.tsx` — sonner instance configured with web's warm palette.
