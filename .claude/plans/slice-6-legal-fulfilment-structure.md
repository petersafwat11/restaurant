# Slice 6 / Phase D — professional PL/EU legal & fulfilment page STRUCTURE

Source plan: `.Codex/plans/stripe-eu-payment-readiness.md` §7 (D1–D9), §3.
Tracker: `.claude/plans/stripe-eu-payment-readiness-execution.md` → Slice 6.
Owner: Claude Code · scope = STRUCTURE + DB-backed facts + version/archive plumbing + ODR fix.
**Binding legal prose is the lawyer's** — every assertion of a right/obligation/deadline is a `{/* LAWYER: … */}` placeholder.

## Architecture (confirmed with advisor)
- **Typed TSX content modules** under `apps/web/src/content/legal/<doc>.tsx` (no MDX — avoids build config; matches the existing terms/privacy PL/EN split).
- Each module exports `SECTIONS` (`{ id, pl, en }[]`) used to drive BOTH the on-page TOC and PL/EN heading parity, plus `<DocPL>`/`<DocEN>` bodies that take DB facts as props.
- Chrome (eyebrow/title/last-updated/TOC heading/print+download labels) lives in `legal.json`. Headings + body text live in content modules (authoritative PL; EN parallel).
- Page bodies stay **server components** (crawler must see facts in initial HTML). Print/download = a tiny `'use client'` island.
- DB facts via `getCompanyInfo(restaurant)` + raw `restaurant` fields; money via `formatMoney` from `@repo/utils` (display formatting only — no client money math).

## D1 — versioned bundle structure + archive
- Reuse `LEGAL_BUNDLE_VERSION` / `LEGAL_BUNDLE_EFFECTIVE_DATE` / `LEGAL_BUNDLE_DOCUMENTS` from `@repo/types` (do NOT edit types).
- New `apps/web/src/features/legal/legal-bundle.ts`: a typed manifest mapping each bundle doc id → its content module + title key, plus a `TableOfContents` + `PrintControls` shared component.
- New archive route `apps/web/src/app/[locale]/legal/archive/[version]/[document]/page.tsx`:
  - `generateStaticParams` = current `LEGAL_BUNDLE_VERSION` × `LEGAL_BUNDLE_DOCUMENTS` (4 docs).
  - Unknown version/doc → `notFound()`. Renders the same content module with a "archived snapshot vX" banner.
  - Scaffold only (one version exists). No per-doc SHA-256 (its home `packages/types` is frozen; C3 deferred).
- Move existing terms/privacy/cookies prose OUT of page TSX into content modules (refactor — preserve copy).

## D2 — new routes + footer links
- New `(marketing)/refunds-complaints/page.tsx`, `(marketing)/delivery-cancellation/page.tsx`, `(marketing)/promotion-terms/page.tsx`.
- Each: metadata (alternates), on-page TOC, print/download affordance.
- Footer (`site-footer-szef.tsx`): extend `bottom.legal` with the 3 new pages (+ keep privacy/terms/cookies). Add labels to `footer.json` (pl+en).
- Cookies + promotion-terms are legal pages but NOT bundle docs (keep distinction; archive covers only the 4).

## D5 — delivery-cancellation DB facts
Render from `restaurant`: trading location (address), enabled channels (delivery/pickup/dine-in flags), delivery radius km, current delivery fee, min order, delivery & pickup ETA ranges, operating hours. Note snapshot preserves purchase-time values.

## D6 — promotion-terms
Structure: eligibility, start/end timezone (Europe/Warsaw), code/redemption limits, min subtotal, stacking/loyalty compatibility, eligible/excluded channels, refund effect + coupon/loyalty reversal, abuse rules preserving mandatory rights. Typed/DB params where available; LAWYER placeholders for binding terms.

## D7 — privacy processing table (Art. 13/14)
Add a processing-table STRUCTURE by data flow: account/auth, guest+registered orders, addresses/geolocation, payments+Stripe Radar/3DS, receipts/accounting, contact, newsletter double-opt-in, SMS via Twilio, security/audit logs, server logs/backups. Columns: data categories, source, purpose, legal basis, required?, recipients, transfer mechanism, retention.
- Processor register reflects ACTUAL config: Contabo hosting, Stripe (when online payments enabled), Twilio (if enabled), Resend OR SMTP (mailer.service.ts uses both — Resend if `RESEND_API_KEY`, else nodemailer/SMTP), OpenStreetMap/Nominatim, local Contabo uploads/backups.
- **Remove Expo / push notifications** (mobile being deleted) — also from existing Privacy §4 prose.
- PostHog/Sentry → "if enabled" (prod template `.env` has them blank). Do NOT claim R2.
- Retention values that are legal commitments → LAWYER placeholder (except the 5-yr tax record already in prose).

## D8 — cookies page
- First-party mechanisms (verified by grep): `web_at` (access, ~15m), `web_rt` (refresh, ~30d), `cart_session` (30d), `NEXT_LOCALE` (~1y).
- Conditional Stripe cookies (`__stripe_mid`, `__stripe_sid`, etc.) with link to Stripe cookie info — shown when online payments enabled.
- **REMOVE the hardcoded "no consent banner required" decision** (EN+PL) → replace with counsel-TODO + factual disclosure.
- Reconcile "no third-party cookies" claim with the conditional-Stripe disclosure (don't stack contradictions).

## D9 — ODR correction
- terms §9 currently does NOT link the EU ODR platform (already UOKiK/ombudsman). Real deliverable: add explicit "EU ODR platform closed 20 July 2025 — use Polish ADR/UOKiK" note where dispute resolution appears; ensure no new page reintroduces the link. Apply in the relocated terms content module + refunds-complaints.

## Out of scope / handoff
- `packages/types`, `apps/api`, `features/*` (non-legal), docs/`*.md` (incl. EU-COMPLIANCE.md PKE update) — NOT mine; note for handoff.
- Binding prose, owner-verified legal values, live processor/DPA status, retention matrix, cookie banner decision → owner/lawyer sign-off list.

## Verify
`pnpm --filter @repo/web typecheck`. No builds/prisma/installs. No commit/push.
