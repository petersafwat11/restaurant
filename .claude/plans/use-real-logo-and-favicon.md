# Use the real Szef Donald emblem as logo + favicon

## Context
`apps/web/public/logo.png` was supplied as a gold circular emblem, but its "transparent"
background was a **checkerboard painted into the pixels** (colorType 2, 0% real alpha).
The existing `logo.tsx` never used the PNG — it drew a placeholder "SD" hexagon.

## What was done to the asset
Keyed the neutral checkerboard to real transparency (kept the warm-cream cutlery, which
differs from the neutral bg only by colour-warmth), defined the edge geometrically (clean
circular disc, no halo), inpainted a baked-in checker pocket at the handle/rim notch,
cropped tight + square → RGBA. Verified on light, dark, and at 16–64px. (pure-Node zlib —
no new deps, since the tree has no sharp/ImageMagick/PIL.)

## Files
1. `apps/web/public/logo.png` — replace with cleaned transparent RGBA, 512×512.
2. `apps/web/src/components/logo.tsx` — rewrite: render `/logo.png` via `<img>` (matches the
   codebase convention; no `next/image` anywhere). Variants:
   - `full` (default): emblem + "Szef Donald" wordmark (`text-fg`).  → headers only
   - `mark`: emblem only.  → everywhere else
   Drop the now-unused `inverse` variant.
3. `apps/web/src/components/site-footer-szef.tsx` — `variant="inverse"` → `variant="mark"`,
   and `apps/web/src/app/[locale]/(auth)/layout.tsx` — `variant="full"` → `variant="mark"`.
   Only the main site header (site-chrome) keeps `full`; hero already `mark`.
4. Favicons in `apps/web/public/` (`icon.png` 256², `apple-icon.png` 180² on brand cream),
   referenced explicitly via `metadata.icons` in `app/[locale]/layout.tsx`. NOT the
   app-root file convention — this app has no `app/layout.tsx` (head is rendered under
   `[locale]`), where a top-level `app/icon.png` can silently fail to emit the <link>.

## Verify
`pnpm --filter web typecheck` (or the app's check-types script). e2e/db not required.
Then run the app and confirm header shows emblem+name, footer/hero show emblem only, and
the browser tab shows the emblem favicon.
