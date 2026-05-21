# Plan: shared `Spinner` primitive + fix checkout flash

## Why

Two related issues, one root cause:

1. **The flash.** On `/checkout/success/[orderId]?t=…`, users see "Your cart is empty" for a beat before the real confirmation renders. Root cause: when `createOrder.mutateAsync()` resolves it invalidates the cart query → cart refetches → returns empty → `checkout-app.tsx` re-renders the empty-state branch (`cartQuery.isSuccess && lines.length === 0`) for the few hundred ms before `router.push('/checkout/success/…')` completes. The empty-state is technically correct for an empty cart on `/checkout`, but it shouldn't show while a submit is in flight.
2. **No shared loading primitive.** Across the two apps, loading states are improvised: 19 `Loader2 / animate-pulse / "Loading…"` occurrences in 13 web files, 34 across 22 admin files. Each is hand-rolled. No consistency between full-page loads, inline button spinners, drawer skeletons.

## What

### 1. New primitive — `Spinner` (in `packages/ui/src/spinner/`)

A single accessible spinning circle. Themed via existing CSS variables (`--accent`, `--fg`, `--fg-muted`, `--surface-warm`), so it picks up each app's palette automatically:
- **web** spins copper on cream
- **admin** spins mint on dark slate

```tsx
<Spinner size="md" tone="accent" label="Loading" />
```

Props:
- `size`: `'xs' | 'sm' | 'md' | 'lg' | 'xl'` → 12 / 16 / 20 / 28 / 40 px
- `tone`: `'accent' | 'fg' | 'muted' | 'invert'`
  - `accent` = brand spin on track (default; copper/mint)
  - `fg` = neutral foreground (for inside dark buttons / hero overlays via `invert`)
  - `muted` = subtle, for inline placeholders
  - `invert` = white spin for dark hero overlays (e.g. on the cover image)
- `label`: visually hidden by default (`<span class="sr-only">`); `labelPosition="below"` renders it underneath in `text-fg-muted`
- `className`: optional override

Visual: a 270° arc on a faint full-circle track, rotating via `animate-spin`. Cleaner than the `Loader2` lucide icon and theme-aware via `currentColor` + `bg-*/[var(--border-alpha)]` track.

### 2. New helper — `PageSpinner` (same file)

Full-page centered spinner with optional `label`. Used in route loading states and skeleton-replacement contexts.

```tsx
<PageSpinner label="Loading your order…" />
```

Renders: centered vertical stack — large `Spinner` + body-l label in `text-fg-muted`, min-height equal to viewport minus header (`min-h-[60vh]`).

### 3. Fix the checkout flash specifically

In `apps/web/src/features/checkout/components/checkout-app.tsx`:
- Track `submitting` (already exists) AND `createOrder.isPending`.
- Gate the empty state on `!submitting && !createOrder.isPending && !createOrder.isSuccess`.
- During submit, render `<PageSpinner label="Placing your order…" />` instead of either the form or the empty state.

This kills the flash without changing any other behavior.

### 4. Migration — use `Spinner` / `PageSpinner` everywhere

#### Web app (apps/web)
Replace patterns to keep visual consistency. Priorities:
- **Full-page loaders** — `confirmation-app.tsx`, `public-tracking-app.tsx`, `locations/page.tsx`, account pages (orders/profile/addresses/notifications/reviews/loyalty/referrals): swap hand-rolled skeletons / "Loading…" text with `<PageSpinner />`.
- **Inline button spinners** — `checkout-app.tsx` (place-order button), `stripe-payment-form.tsx`, auth pages (verify-email): swap `Loader2` with `<Spinner size="sm" tone="invert" />` inside accent buttons, `tone="fg"` elsewhere.

#### Admin app (apps/admin)
- **Route group layouts** — `(dashboard)/layout.tsx`, `(kitchen)/layout.tsx`, `(auth)/layout.tsx`: replace bootstrap spinners with `<PageSpinner />`.
- **Inline button spinners** — auth pages (login / register / reset / forgot / verify), settings pages, drawer save buttons (orders, customers, items), kpi-row: `<Spinner size="sm" />`.
- **Drawer / dialog loaders** — `order-detail-drawer.tsx`, `customer-drawer.tsx`, `item-editor-drawer.tsx`, `restaurant-switcher.tsx`, `reservations/[id]`, `orders/[id]`, KDS page, `restaurant/page.tsx`: contextual sizes.

Skeletons that mimic real layout (e.g. data-table row skeletons) stay as-is — they communicate structure, not just busy state. Only "spinner-style" loaders get migrated.

### 5. Export

Add to `packages/ui/src/index.ts`:
```ts
export { Spinner, PageSpinner, type SpinnerProps, type PageSpinnerProps } from './spinner';
```

## Out of scope

- No new motion / keyframe animations beyond Tailwind's `animate-spin`.
- No replacement of *layout-matching skeletons* (e.g. data-table loading rows). Those convey structure, which a spinner can't.
- No changes to cart-refresh semantics in `useCreateOrder` — the fix is on the render side.

## File list

**Create**
- `packages/ui/src/spinner/index.tsx`

**Modify (Sprint 1 — core primitive + flash fix)**
- `packages/ui/src/index.ts` (export)
- `apps/web/src/features/checkout/components/checkout-app.tsx` (gate empty state, use PageSpinner)

**Modify (Sprint 2 — web migration, ~13 files)**
- web `confirmation-app.tsx`, `public-tracking-app.tsx`, `stripe-payment-form.tsx`, `locations/page.tsx`, `(auth)/verify-email`, `(account)/account/{orders,profile,addresses,notifications,reviews,loyalty,referrals}/page.tsx`

**Modify (Sprint 3 — admin migration, ~22 files)**
- admin layouts: `(dashboard)`, `(kitchen)`, `(auth)`
- auth pages: login / register / reset / forgot / verify
- pages: kds, orders/[id], reservations / reservations/[id], settings + sub-pages, restaurant
- features: orders / customers / menu / overview drawers and rows
- `restaurant-switcher.tsx`

## Acceptance

- `pnpm --filter @repo/web exec tsc --noEmit` and `pnpm --filter @repo/admin exec tsc --noEmit` both clean (modulo pre-existing `polygon-map-editor` errors).
- `/checkout` → submit → `/checkout/success/[id]`: no "your cart is empty" flash; spinner shows during submit.
- Spinner renders copper on web, mint on admin without any per-app code.
- `Loader2` import count in app code drops to ~0 (keep only if explicitly desired).
