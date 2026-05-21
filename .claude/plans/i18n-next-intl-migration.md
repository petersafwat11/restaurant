# i18n Migration — `next-intl` (web/admin) + `nestjs-i18n` (API) + mobile infra

**Status:** Draft for approval — do not implement yet.
**Owners:** infra phase 1×, parallel agents 14× for page migration.
**Scope:** Replace the hand-rolled `@repo/i18n` translator with battle-tested libraries; restructure messages into per-page namespaces; extract every hardcoded string from `apps/web` (29 pages) and `apps/admin` (30 pages); set up mobile i18n infrastructure (no page work).

---

## 1. Locked decisions

| | Value |
|---|---|
| Locales | `pl` (default, primary), `en` (secondary). `ar` dropped. |
| Library — web | `next-intl` v4 |
| Library — admin | `next-intl` v4 |
| Library — API | `nestjs-i18n` |
| Library — mobile (infra only) | `i18next` + `react-i18next` + `i18next-icu` + `expo-localization` |
| URL routing | `[locale]` URL segments, `localePrefix: 'as-needed'` (PL unprefixed, EN under `/en/...`) |
| Locale persistence | Cookie (`NEXT_LOCALE`) as preference; URL is canonical (deep links win over cookie). |
| SEO | `<link rel="alternate" hreflang="…">` per page + sitemap per locale. |
| Route slug localization | **No.** Page content is translated; URL slugs stay English (`/menu`, `/cart`, etc.). Documented as future option. |
| Translation source | LLM-produced PL + EN at agent runtime; user reviews PL afterwards. |
| Cookie strategy on switch | LanguageSwitcher updates URL + cookie atomically; deep links override cookie. |
| Old `@repo/i18n` code | Deleted. Package keeps **JSON message files only**. |
| Existing `/api/i18n/messages` endpoint | Deleted. Web bundles via SSR; mobile reads JSON from `@repo/i18n` directly. |

---

## 2. Final architecture

### `packages/i18n/` — messages only (no code)

```
packages/i18n/
├── messages/
│   ├── en/
│   │   ├── common.json              # OK, Cancel, Save, generic actions
│   │   ├── errors.json              # generic error toasts
│   │   ├── validation.json          # form validation
│   │   ├── shared/
│   │   │   ├── order-status.json    # PENDING, CONFIRMED, ... (used by API + web + admin)
│   │   │   └── order-notify.json    # "Order {number} placed —" (API emails + web toasts)
│   │   ├── web/
│   │   │   ├── layout.json          # header, footer, language switcher labels
│   │   │   ├── marketing/
│   │   │   │   ├── home.json
│   │   │   │   ├── about.json
│   │   │   │   ├── contact.json
│   │   │   │   ├── locations.json
│   │   │   │   └── reservations.json
│   │   │   ├── auth/
│   │   │   │   ├── login.json
│   │   │   │   ├── register.json
│   │   │   │   ├── forgot-password.json
│   │   │   │   ├── reset-password.json
│   │   │   │   └── verify-email.json
│   │   │   ├── shop/
│   │   │   │   ├── menu.json
│   │   │   │   ├── menu-category.json
│   │   │   │   ├── menu-item.json
│   │   │   │   ├── cart.json
│   │   │   │   ├── checkout.json
│   │   │   │   └── checkout-success.json
│   │   │   ├── account/
│   │   │   │   ├── layout.json
│   │   │   │   ├── profile.json
│   │   │   │   ├── orders.json
│   │   │   │   ├── order-detail.json
│   │   │   │   ├── addresses.json
│   │   │   │   ├── loyalty.json
│   │   │   │   ├── referrals.json
│   │   │   │   ├── reservations.json
│   │   │   │   ├── reviews.json
│   │   │   │   └── notifications.json
│   │   │   ├── public/
│   │   │   │   └── track.json
│   │   │   └── staff/
│   │   │       └── accept-invite.json
│   │   └── admin/
│   │       ├── layout.json
│   │       ├── auth/                # login, register, forgot-password, reset-password, verify-email
│   │       │   └── (5 files)
│   │       ├── dashboard.json
│   │       ├── menu.json
│   │       ├── restaurant.json
│   │       ├── audit-log.json
│   │       ├── contact.json
│   │       ├── customers/           # list.json, detail.json
│   │       ├── locations/           # list.json, detail.json
│   │       ├── orders/              # list.json, detail.json, kitchen.json
│   │       ├── promotions/          # list.json, detail.json
│   │       ├── reports/             # overview.json, exports.json
│   │       ├── reservations/        # list.json, detail.json
│   │       ├── reviews.json
│   │       ├── settings/            # general.json, hours.json, holidays.json, delivery-zones.json
│   │       ├── staff.json
│   │       └── kds.json
│   └── pl/                          # mirror of en/, same files, Polish translations
├── src/
│   ├── index.ts                     # re-exports
│   ├── locale.ts                    # type Locale = 'pl' | 'en'; LOCALES; DEFAULT_LOCALE = 'pl'; isLocale()
│   └── messages.ts                  # loadMessages(locale) — merges JSON tree → nested object
├── package.json
└── tsconfig.json
```

**Deleted:** `src/translator.ts`, `src/negotiate.ts`, `src/format.ts`, `src/catalog.ts`, `src/i18n.test.ts`, `src/locales/`.

**`messages.ts`** is a small helper used by next-intl, nestjs-i18n, and i18next:

```ts
// packages/i18n/src/messages.ts
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Locale } from './locale';

// At runtime, walks messages/<locale>/ and merges JSON files into a nested
// object keyed by directory + filename (sans .json).
// e.g. messages/en/web/shop/menu.json → { web: { shop: { menu: { ... } } } }
export async function loadMessages(locale: Locale): Promise<Record<string, unknown>> { ... }
```

For next-intl request-time loading (which runs in Node during SSR), this is fine. For build-time bundling we use a glob import (Vite/Next dynamic-import map).

### Final namespace usage examples

| Library | Code | Loads from |
|---|---|---|
| next-intl (web) | `const t = useTranslations('web.account.profile')` | `messages/{locale}/web/account/profile.json` |
| next-intl (admin) | `const t = useTranslations('admin.orders.list')` | `messages/{locale}/admin/orders/list.json` |
| Shared | `const t = useTranslations('shared.orderStatus')` | `messages/{locale}/shared/order-status.json` |
| nestjs-i18n (API) | `i18n.t('shared.orderNotify.placed', { args: { number } })` | same JSON tree |

---

## 3. Web app — `apps/web`

### URL structure after migration

| Path | Locale | Notes |
|---|---|---|
| `/` | PL | unprefixed default |
| `/menu`, `/cart`, `/checkout` | PL | unprefixed |
| `/en/`, `/en/menu`, `/en/cart` | EN | prefixed |
| Bare `/menu` + cookie=`en` | redirect → `/en/menu` | next-intl middleware does this |
| `/en/menu` regardless of cookie | EN | URL wins |
| Googlebot crawls `/menu` | PL (no cookies, no redirect) | clean SEO |

### Files to create / modify

```
apps/web/src/
├── app/
│   └── [locale]/                    # move every existing route under here
│       ├── layout.tsx               # ← new root locale layout (wraps with NextIntlClientProvider)
│       ├── (marketing)/...          # moved
│       ├── (auth)/...               # moved
│       ├── (shop)/...               # moved
│       ├── (account)/...            # moved
│       ├── (public)/...             # moved
│       └── staff/...                # moved
├── i18n/
│   ├── routing.ts                   # defineRouting (locales, defaultLocale, localePrefix)
│   ├── request.ts                   # getRequestConfig — reads requestLocale, loads messages
│   └── navigation.ts                # createNavigation → Link, useRouter, redirect, usePathname, getPathname
├── middleware.ts                    # ← rewrite: compose next-intl middleware + existing auth
├── components/language-switcher.tsx # ← rewire to use i18n/navigation Link replacement
└── providers/app-providers.tsx      # unchanged
apps/web/next.config.ts              # add createNextIntlPlugin('./src/i18n/request.ts')
```

### Key snippets (locked design)

**`src/i18n/routing.ts`:**
```ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['pl', 'en'],
  defaultLocale: 'pl',
  localePrefix: 'as-needed',
  localeCookie: { name: 'NEXT_LOCALE', maxAge: 60 * 60 * 24 * 365 },
});
```

**`src/i18n/request.ts`:**
```ts
import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { loadMessages } from '@repo/i18n';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const messages = await loadMessages(locale);
  return { locale, messages };
});
```

**`src/middleware.ts`** (composition with existing auth guard):
```ts
import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);
const PROTECTED = ['/account', '/profile', '/addresses', '/loyalty', '/referrals', '/notifications'];

function stripLocale(pathname: string): string {
  const seg = pathname.split('/')[1];
  return routing.locales.includes(seg as never) ? `/${pathname.split('/').slice(2).join('/')}` : pathname;
}

export default function middleware(req: NextRequest) {
  const path = stripLocale(req.nextUrl.pathname);
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));
  if (isProtected && !req.cookies.get('auth_session')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url); // intl middleware then prefixes /en/ if needed
  }
  return intlMiddleware(req);
}

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
```

**`app/[locale]/layout.tsx`:**
```tsx
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} dir="ltr">
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

**`next.config.ts`:** wrap export with `createNextIntlPlugin('./src/i18n/request.ts')`.

**LanguageSwitcher rewrite** uses `next-intl/navigation`'s `useRouter` + `usePathname` to swap locale:
```tsx
const router = useRouter();
const pathname = usePathname();
const locale = useLocale();
function switchTo(next: 'pl' | 'en') {
  router.replace(pathname, { locale: next }); // cookie auto-updates
}
```

**SEO additions** — in each `page.tsx`'s `generateMetadata`:
```ts
import { getTranslations, getPathname } from 'next-intl/server';
// emit hreflang alternates
const alternates = {
  languages: {
    pl: getPathname({ locale: 'pl', href: '/menu' }),
    en: getPathname({ locale: 'en', href: '/menu' }),
  },
};
return { title, description, alternates };
```

A reusable `lib/seo/alternates.ts` helper generates this per page.

`sitemap.ts` emits both locales.

---

## 4. Admin app — `apps/admin`

Same architecture as web — `[locale]` segment, same `i18n/routing.ts` / `request.ts` / `navigation.ts` files (duplicated, not shared, so each app can diverge if needed). LanguageSwitcher placed in the dashboard topbar. No SEO concerns (admin isn't indexed).

Files mirror web:
```
apps/admin/src/
├── app/[locale]/
│   ├── layout.tsx
│   ├── (auth)/...
│   ├── (dashboard)/...
│   └── (kitchen)/...
├── i18n/{routing,request,navigation}.ts
├── middleware.ts                    # NEW — admin currently has no middleware; this becomes the only one
└── components/language-switcher.tsx # NEW — port from web
```

`middleware.ts` is the same as web's but **without** the protected-paths block (admin auth happens in `(dashboard)/layout.tsx`'s `AuthGate`).

---

## 5. API — `apps/api` — `nestjs-i18n`

### Module setup

```ts
// apps/api/src/app.module.ts
import path from 'node:path';
import {
  AcceptLanguageResolver, CookieResolver, HeaderResolver, I18nJsonLoader, I18nModule, QueryResolver,
} from 'nestjs-i18n';

I18nModule.forRoot({
  fallbackLanguage: 'pl',
  loaders: [
    new I18nJsonLoader({
      // Resolved via require.resolve to find @repo/i18n's messages folder
      path: path.join(require.resolve('@repo/i18n/package.json'), '../messages/'),
      watch: process.env.NODE_ENV !== 'production',
    }),
  ],
  resolvers: [
    new QueryResolver(['lang']),
    new HeaderResolver(['x-locale']),
    new CookieResolver(['NEXT_LOCALE']),
    AcceptLanguageResolver,
  ],
  typesOutputPath: path.join(__dirname, '../../src/generated/i18n.generated.ts'),
})
```

### Files to change

| File | Change |
|---|---|
| `apps/api/src/app.module.ts` | Add `I18nModule.forRoot(...)` |
| `apps/api/src/i18n/i18n.controller.ts` | **Delete** (and its module). Web no longer fetches messages over HTTP. |
| `apps/api/src/notifications/notification-dispatcher.service.ts` | Replace `createTranslator(locale)` calls with `i18n.t('shared.orderNotify.placed', { lang: locale, args: { number } })`. |
| `apps/api/src/notifications/notification-matrix.ts` | Same. Use `I18nService<I18nTranslations>` injection. |
| `apps/api/src/generated/i18n.generated.ts` | **New** — auto-generated by nestjs-i18n on first boot. Gitignored or committed (TBD — committed, so CI doesn't need a boot to typecheck). |
| `package.json` (api) | Drop `@repo/i18n` runtime usage of translator; keep as workspace dep so JSON path resolves. |
| `apps/api/test/**` | Update any test that used `createTranslator` / `negotiateLocale` to use `I18nService` or assert via the HTTP layer. |

### Notification template keys

Today: `order.notify.placed`. After: `shared.orderNotify.placed`. Same string, new location. Polish notification text is preserved verbatim from `pl.json`.

---

## 6. Mobile — `apps/mobile` — infra only

Pages will be rewritten later. Now: stand up i18next so when pages land, the provider + hooks already work.

### Install

```
pnpm --filter @repo/mobile add i18next react-i18next i18next-icu intl-messageformat expo-localization
```

### Files

```
apps/mobile/src/i18n/
├── index.ts            # initializes i18next with ICU, loads messages from @repo/i18n
├── language-detector.ts # custom detector — reads SecureStore, falls back to expo-localization
└── messages.ts          # static imports of every JSON (Metro can't dynamic-glob like Webpack)
```

### `messages.ts` strategy

Since Metro bundler can't filesystem-walk at runtime, statically import each JSON file:

```ts
// apps/mobile/src/i18n/messages.ts
import enCommon from '@repo/i18n/messages/en/common.json';
// ... one import per file
import plCommon from '@repo/i18n/messages/pl/common.json';
// ...

export const RESOURCES = {
  en: { translation: deepMerge({ common: enCommon, errors: enErrors, /* ... */ }) },
  pl: { translation: deepMerge({ common: plCommon, errors: plErrors, /* ... */ }) },
};
```

A small build script (`scripts/build-mobile-i18n.ts`) generates `messages.ts` from the filesystem so it stays in sync — runs in `prebuild` of mobile.

### Language detector

```ts
import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import type { LanguageDetectorAsyncModule } from 'i18next';

export const detector: LanguageDetectorAsyncModule = {
  type: 'languageDetector',
  async: true,
  init: () => {},
  detect: async () => {
    const stored = await SecureStore.getItemAsync('app.locale');
    if (stored === 'pl' || stored === 'en') return stored;
    const device = Localization.getLocales()[0]?.languageCode;
    return device === 'pl' ? 'pl' : 'pl'; // default PL
  },
  cacheUserLanguage: async (lng) => {
    await SecureStore.setItemAsync('app.locale', lng);
  },
};
```

### Provider wiring

```tsx
// apps/mobile/app/_layout.tsx
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@/i18n';

export default function RootLayout() {
  return (
    <I18nextProvider i18n={i18n}>
      {/* existing tree */}
    </I18nextProvider>
  );
}
```

### Existing `useLocale` / `useMessages` hooks

Replace with thin wrappers around `useTranslation()` from `react-i18next`. Old `getApiClient().i18n.messages(locale)` call is **removed** — mobile reads from bundled JSON.

### What we explicitly DON'T do for mobile in this round

- No `useTranslation('namespace')` calls in existing screens (they're being deleted)
- No language switcher UI (pages will rebuild)
- No e2e mobile tests for i18n (covered when pages are built)

---

## 7. Naming conventions (locked)

| Rule | Value |
|---|---|
| JSON file structure | Directory + filename map 1:1 to nested object path |
| Namespace dot path | `<app>.<area>.<page>` (e.g. `admin.orders.list`) |
| Key style inside file | `camelCase`. Sections allowed (e.g. `form.submit`, `empty.title`) |
| ICU plural syntax | Standard MessageFormat: `{count, plural, one {…} few {…} many {…} other {…}}` |
| Interpolation | `{varName}` — no `%{varName}`, no `<%=` |
| Reserved keys | Each file may have `title`, `description`, `empty`, `actions`, `errors` sections by convention |
| File name | kebab-case (matches existing project conventions) |
| Component callsite | `const t = useTranslations('web.shop.menu');  t('title')` |
| Missing key fallback | next-intl returns key path in dev, throws in prod (use `getMessageFallback` to override) |

### "Common" vs "page-specific" decision rule

Put a string in `common.json` if:
- It appears in 3+ unrelated pages, AND
- Its meaning is identical in all contexts (e.g. "Cancel" button).

Otherwise duplicate it in each page's file. Duplication is cheaper than wrong reuse.

Validation messages live in `validation.json` and are referenced from the Zod resolver's error map.

---

## 8. Page → namespace mapping (canonical for parallel agents)

### Web (29 pages)

| Route | File path | Namespace | Message file |
|---|---|---|---|
| `/` | `(marketing)/page.tsx` | `web.marketing.home` | `web/marketing/home.json` |
| `/about` | `(marketing)/about/page.tsx` | `web.marketing.about` | `web/marketing/about.json` |
| `/contact` | `(marketing)/contact/page.tsx` | `web.marketing.contact` | `web/marketing/contact.json` |
| `/locations` | `(marketing)/locations/page.tsx` | `web.marketing.locations` | `web/marketing/locations.json` |
| `/reservations` | `(marketing)/reservations/page.tsx` | `web.marketing.reservations` | `web/marketing/reservations.json` |
| `/login` | `(auth)/login/page.tsx` | `web.auth.login` | `web/auth/login.json` |
| `/register` | `(auth)/register/page.tsx` | `web.auth.register` | `web/auth/register.json` |
| `/forgot-password` | `(auth)/forgot-password/page.tsx` | `web.auth.forgotPassword` | `web/auth/forgot-password.json` |
| `/reset-password` | `(auth)/reset-password/page.tsx` | `web.auth.resetPassword` | `web/auth/reset-password.json` |
| `/verify-email` | `(auth)/verify-email/page.tsx` | `web.auth.verifyEmail` | `web/auth/verify-email.json` |
| `/menu` | `(shop)/menu/page.tsx` | `web.shop.menu` | `web/shop/menu.json` |
| `/menu/[category]` | `(shop)/menu/[category]/page.tsx` | `web.shop.menuCategory` | `web/shop/menu-category.json` |
| `/menu/[category]/[slug]` | `(shop)/menu/[category]/[slug]/page.tsx` | `web.shop.menuItem` | `web/shop/menu-item.json` |
| `/cart` | `(shop)/cart/page.tsx` | `web.shop.cart` | `web/shop/cart.json` |
| `/checkout` | `(shop)/checkout/page.tsx` | `web.shop.checkout` | `web/shop/checkout.json` |
| `/checkout/success` | `(shop)/checkout/success/page.tsx` | `web.shop.checkoutSuccess` | `web/shop/checkout-success.json` |
| `/checkout/success/[orderId]` | `(shop)/checkout/success/[orderId]/page.tsx` | `web.shop.checkoutSuccess` | (same file) |
| `/track/[orderId]` | `(public)/track/[orderId]/page.tsx` | `web.public.track` | `web/public/track.json` |
| `/staff/accept-invite` | `staff/accept-invite/page.tsx` | `web.staff.acceptInvite` | `web/staff/accept-invite.json` |
| `/account` redirect | `(account)/account/page.tsx` | n/a | n/a |
| `/account/profile` | `(account)/account/profile/page.tsx` | `web.account.profile` | `web/account/profile.json` |
| `/account/orders` | `(account)/account/orders/page.tsx` | `web.account.orders` | `web/account/orders.json` |
| `/account/orders/[id]` | `(account)/account/orders/[id]/page.tsx` | `web.account.orderDetail` | `web/account/order-detail.json` |
| `/account/addresses` | `(account)/account/addresses/page.tsx` | `web.account.addresses` | `web/account/addresses.json` |
| `/account/loyalty` | `(account)/account/loyalty/page.tsx` | `web.account.loyalty` | `web/account/loyalty.json` |
| `/account/referrals` | `(account)/account/referrals/page.tsx` | `web.account.referrals` | `web/account/referrals.json` |
| `/account/reservations` | `(account)/account/reservations/page.tsx` | `web.account.reservations` | `web/account/reservations.json` |
| `/account/reviews` | `(account)/account/reviews/page.tsx` | `web.account.reviews` | `web/account/reviews.json` |
| `/account/notifications` | `(account)/account/notifications/page.tsx` | `web.account.notifications` | `web/account/notifications.json` |
| Account layout/sidebar | `(account)/layout.tsx` | `web.account.layout` | `web/account/layout.json` |
| Marketing layout | `(marketing)/layout.tsx` | `web.layout` | `web/layout.json` |

### Admin (30 pages)

| Route | File path | Namespace | Message file |
|---|---|---|---|
| Layout (sidebar/topbar) | `(dashboard)/layout.tsx` | `admin.layout` | `admin/layout.json` |
| `/login` | `(auth)/login/page.tsx` | `admin.auth.login` | `admin/auth/login.json` |
| `/register` | `(auth)/register/page.tsx` | `admin.auth.register` | `admin/auth/register.json` |
| `/forgot-password` | `(auth)/forgot-password/page.tsx` | `admin.auth.forgotPassword` | `admin/auth/forgot-password.json` |
| `/verify-email` | `(auth)/verify-email/page.tsx` | `admin.auth.verifyEmail` | `admin/auth/verify-email.json` |
| `/reset-password` | `(auth)/reset-password/page.tsx` | `admin.auth.resetPassword` | `admin/auth/reset-password.json` |
| `/` | `(dashboard)/page.tsx` | `admin.dashboard` | `admin/dashboard.json` |
| `/menu` | `(dashboard)/menu/page.tsx` | `admin.menu` | `admin/menu.json` |
| `/restaurant` | `(dashboard)/restaurant/page.tsx` | `admin.restaurant` | `admin/restaurant.json` |
| `/audit-log` | `(dashboard)/audit-log/page.tsx` | `admin.auditLog` | `admin/audit-log.json` |
| `/contact` | `(dashboard)/contact/page.tsx` | `admin.contact` | `admin/contact.json` |
| `/customers` | `(dashboard)/customers/page.tsx` | `admin.customers.list` | `admin/customers/list.json` |
| `/customers/[id]` | `(dashboard)/customers/[id]/page.tsx` | `admin.customers.detail` | `admin/customers/detail.json` |
| `/locations` | `(dashboard)/locations/page.tsx` | `admin.locations.list` | `admin/locations/list.json` |
| `/locations/[id]` | `(dashboard)/locations/[id]/page.tsx` | `admin.locations.detail` | `admin/locations/detail.json` |
| `/orders` | `(dashboard)/orders/page.tsx` | `admin.orders.list` | `admin/orders/list.json` |
| `/orders/[id]` | `(dashboard)/orders/[id]/page.tsx` | `admin.orders.detail` | `admin/orders/detail.json` |
| `/orders/kitchen` | `(dashboard)/orders/kitchen/page.tsx` | `admin.orders.kitchen` | `admin/orders/kitchen.json` |
| `/promotions` | `(dashboard)/promotions/page.tsx` | `admin.promotions.list` | `admin/promotions/list.json` |
| `/promotions/[id]` | `(dashboard)/promotions/[id]/page.tsx` | `admin.promotions.detail` | `admin/promotions/detail.json` |
| `/reports` | `(dashboard)/reports/page.tsx` | `admin.reports.overview` | `admin/reports/overview.json` |
| `/reports/exports` | `(dashboard)/reports/exports/page.tsx` | `admin.reports.exports` | `admin/reports/exports.json` |
| `/reservations` | `(dashboard)/reservations/page.tsx` | `admin.reservations.list` | `admin/reservations/list.json` |
| `/reservations/[id]` | `(dashboard)/reservations/[id]/page.tsx` | `admin.reservations.detail` | `admin/reservations/detail.json` |
| `/reviews` | `(dashboard)/reviews/page.tsx` | `admin.reviews` | `admin/reviews.json` |
| `/settings` | `(dashboard)/settings/page.tsx` | `admin.settings.general` | `admin/settings/general.json` |
| `/settings/hours` | `(dashboard)/settings/hours/page.tsx` | `admin.settings.hours` | `admin/settings/hours.json` |
| `/settings/holidays` | `(dashboard)/settings/holidays/page.tsx` | `admin.settings.holidays` | `admin/settings/holidays.json` |
| `/settings/delivery-zones` | `(dashboard)/settings/delivery-zones/page.tsx` | `admin.settings.deliveryZones` | `admin/settings/delivery-zones.json` |
| `/staff` | `(dashboard)/staff/page.tsx` | `admin.staff` | `admin/staff.json` |
| `/kds` | `(kitchen)/kds/page.tsx` | `admin.kds` | `admin/kds.json` |

### Shared / cross-cutting

| Concern | Namespace | File |
|---|---|---|
| Order status enums | `shared.orderStatus` | `shared/order-status.json` |
| Order lifecycle notifications | `shared.orderNotify` | `shared/order-notify.json` |
| Generic buttons / actions | `common` | `common.json` |
| API/UI error toasts | `errors` | `errors.json` |
| Form validation messages | `validation` | `validation.json` |

---

## 9. Reference implementations (phase 0)

Before any parallel agents fan out, **two pages are migrated end-to-end** by the lead implementer to serve as templates. Agents are told to mimic these.

- **Web reference:** `/account/profile` (`(account)/account/profile/page.tsx`)
  - Why: small, has form labels, button text, validation messages, page title — touches every common concern except plurals.
- **Admin reference:** `/orders` (`(dashboard)/orders/page.tsx`)
  - Why: has table headers, filters, KPIs, page header context, pluralized counts ("3 orders"). Representative of dashboard density.

Each reference page produces:
- The matching JSON files (`en/` + `pl/` versions, full translations)
- The migrated `.tsx` (every string replaced by `t('…')`)
- One e2e test that loads the page in both locales and asserts visible text differs
- A diff link the parallel agents will be given as their "follow this pattern" reference

---

## 10. Phases & execution

### Phase 0 — Foundation (sequential, lead implementer; ~1 day)

1. **Verify `next-intl` v4 + `nestjs-i18n` API names** via context7 (done in plan prep).
2. **Drop Arabic everywhere**:
   - `packages/i18n/src/locale.ts` — remove `'ar'` from `LOCALES`
   - Delete `packages/i18n/src/locales/ar.json`
   - Remove `ar` from `api/i18n/messages` response if endpoint kept (it isn't — deleted).
3. **Restructure `packages/i18n/messages/`** from flat `en.json` / `pl.json` to the per-page tree above. The existing translations in current `en.json` / `pl.json` map to the new files like this:
   - `common.*` → `messages/{locale}/common.json` (verbatim)
   - `validation.*` → `messages/{locale}/validation.json` (verbatim)
   - `errors.*` → `messages/{locale}/errors.json` (verbatim)
   - `auth.*` → split into `web/auth/*.json` and `admin/auth/*.json` (mostly duplicated, can refine per agent)
   - `menu.*` → `web/shop/menu.json` (+ menu-item.json for detail-specific)
   - `cart.*` → `web/shop/cart.json`
   - `checkout.*` → `web/shop/checkout.json`
   - `order.*` → `shared/order-status.json` + `shared/order-notify.json` + `web/account/orders.json`
   - `account.*` → `web/account/layout.json` (nav labels)
   - `loyalty.*` → `web/account/loyalty.json`
   - `reviews.*` → `web/account/reviews.json`
   - `referral.*` → `web/account/referrals.json`
   - `notifications.*` → `web/account/notifications.json`
   - `marketing.*` → `web/marketing/home.json`
   - This restructure preserves Polish plural forms (`one/few/many/other`).
4. **Delete old code in `@repo/i18n`**: `translator.ts`, `negotiate.ts`, `format.ts`, `catalog.ts`, `i18n.test.ts`, `locales/`.
5. **Add `messages.ts` loader** and re-export from `index.ts`. Update `package.json` exports.
6. **Install libraries**:
   - Web: `pnpm --filter @repo/web add next-intl`
   - Admin: `pnpm --filter @repo/admin add next-intl`
   - API: `pnpm --filter @repo/api add nestjs-i18n`
   - Mobile: `pnpm --filter @repo/mobile add i18next react-i18next i18next-icu intl-messageformat expo-localization`
7. **Wire web infra**: create `i18n/{routing,request,navigation}.ts`, rewrite `middleware.ts`, move `app/**` under `app/[locale]/**`, create root `[locale]/layout.tsx`, update `next.config.ts`, port `LanguageSwitcher`.
8. **Wire admin infra**: same as web, no protected-paths middleware.
9. **Wire API infra**: add `I18nModule.forRoot`, delete `i18n.controller.ts`, refactor notification dispatcher + matrix, generate types file, commit.
10. **Wire mobile infra**: create `src/i18n/`, install detector, wrap `_layout.tsx` with `I18nextProvider`. (No screen translation work.)
11. **Migrate reference pages**: `/account/profile` (web) and `/orders` (admin), end-to-end with JSON + tests.
12. **Verification gate**:
    - `pnpm typecheck` clean across all apps
    - `pnpm test` in api, web, admin pass
    - Manual smoke: `/`, `/en/`, `/menu`, `/en/menu`, switcher, deep-link with cookie, 404 on invalid locale
    - Notification e2e: place order, assert email body uses correct locale

Only after this gate passes do parallel agents start.

### Phase 1 — Parallel page migration

Each agent works in **isolated directories** (no overlap) to prevent merge conflicts. Each agent gets:
- The page → namespace mapping table for its batch
- A link to the reference diff (web ref or admin ref)
- The naming conventions section
- Rule: PL translations are primary quality; EN matches PL semantically (since EN was the dev's reading aid). Plural categories `one/few/many/other` for PL.
- Rule: every visible string moves; no "kept by design" exceptions.
- Verify command: `pnpm --filter @repo/web typecheck && pnpm --filter @repo/web test`
- Forbidden: touching files outside the batch list.

**Web batches:**

| Batch | Pages | Files touched |
|---|---|---|
| W1 — Marketing | `/`, `/about`, `/contact`, `/locations`, `/reservations` + marketing layout | 5 pages + 5 JSON × 2 locales |
| W2 — Auth | login, register, forgot-password, reset-password, verify-email | 5 pages + 5 JSON × 2 |
| W3 — Shop catalog | `/menu`, `/menu/[category]`, `/menu/[category]/[slug]` | 3 pages + 3 JSON × 2 |
| W4 — Cart + checkout | `/cart`, `/checkout`, `/checkout/success`, `/checkout/success/[orderId]` | 4 pages + 3 JSON × 2 |
| W5 — Account chrome + profile | layout, profile (already done as ref), addresses, notifications | layout + 2 pages |
| W6 — Account orders | orders list, order detail | 2 pages + 2 JSON × 2 |
| W7 — Account loyalty/social | loyalty, referrals, reservations, reviews | 4 pages + 4 JSON × 2 |
| W8 — Public + staff | `/track/[orderId]`, `/staff/accept-invite` | 2 pages + 2 JSON × 2 |

**Admin batches:**

| Batch | Pages |
|---|---|
| A1 — Layout + auth | layout + 5 auth pages |
| A2 — Dashboard + reports | `/`, `/reports`, `/reports/exports` |
| A3 — Orders + KDS | orders list, orders detail, orders/kitchen, kds (already partial ref) |
| A4 — Menu + restaurant + locations | menu, restaurant, locations list, locations detail |
| A5 — Customers + reservations + reviews + audit-log + contact | 8 pages |
| A6 — Promotions + staff + settings | promotions list, promotions detail, staff, settings general/hours/holidays/delivery-zones |

**Total: 14 parallel agents, each ~3–8 pages.**

### Phase 2 — Integration & polish

1. Lead reviews all agent PRs.
2. Reconcile `common.json` if multiple agents duplicated the same key — promote to `common`, update callsites.
3. SEO additions: `generateMetadata` alternates + sitemap for web (admin skipped).
4. Smoke pass across every page in both locales.
5. Run typecheck + full test matrix.
6. Manual QA: a customer flow in PL (browse → cart → checkout → order detail), and the same in EN.
7. Manual QA: admin flow in PL (login → orders → detail → status update emits PL toast and PL email).

---

## 11. Verification & tests

| Test | Scope | Where |
|---|---|---|
| `<html lang>` matches URL locale | web, admin | e2e (playwright) |
| Switching language updates URL + cookie + content | web, admin | e2e |
| Deep link `/en/menu` with PL cookie renders EN | web | e2e |
| Invalid locale `/fr/...` → 404 | web, admin | e2e |
| `hreflang` alternates present | web | unit/snapshot |
| Order placed in PL → email body Polish | API | existing notification e2e |
| Order placed with `Accept-Language: en` → EN body | API | new e2e |
| Missing-key behavior fails CI | all | new lint task: a node script asserts EN and PL JSON files have identical key paths |
| `nestjs-i18n` typed key codegen is committed and up to date | API | CI script asserts `i18n.generated.ts` matches output of `--type-check` regen |
| No remaining imports of deleted `@repo/i18n` translator | all | grep guard in CI |

---

## 12. Cutover & rollback

- All changes go on a feature branch `feat/i18n-next-intl`. No merge to `main` until phases 0 + 1 + 2 are complete.
- Rollback is `git revert <merge-commit>`. The `@repo/i18n` JSON tree is additive on disk — old `en.json`/`pl.json` can be restored from history.
- One database/migration concern: **none.** This is a pure code + assets migration. No schema changes.

---

## 13. Locked decisions (approved)

| | Locked |
|---|---|
| Q1 Cookie name | `NEXT_LOCALE` (next-intl default) |
| Q2 Reference scope | Web: `(marketing)/layout`, `(account)/layout`, `LanguageSwitcher`, `/account/profile`. Admin: `(dashboard)/layout`, topbar `LanguageSwitcher`, `/orders`. Layouts migrate in phase 0 to avoid half-translated screens during phase 1. |
| Q3 Notification keys | Shared. `shared/order-notify.json` + `shared/order-status.json`, accessible to both API (emails/SMS/push) and frontend (toasts/labels). |
| Q4 Sitemap | Auto-generated via `app/sitemap.ts` using next-intl `getPathname` with `hreflang` alternates. Web only; admin not indexed. |
| Q5 Generated `i18n.generated.ts` | Commit, with CI freshness guard that regens + diffs. |
| Q6 Localized URL slugs | No. English slugs for now. Revisit later as targeted SEO. |
| Q7 Rendering strategy | Marketing pages static (SSG) via `generateStaticParams` per locale; everything else dynamic. |
| Q8 Format helpers | Drop custom `format.ts`. Use `useFormatter()` (next-intl) on web/admin and nestjs-i18n formatters on API; default currency PLN. |
| Q9 Zod error messages | Shared `validation.json`. Frontend `getZodErrorMap(t)` + backend `ZodValidationPipe` both consult the same keys. Set up in phase 0. |
| Q10 Admin auth LanguageSwitcher | Yes — placed in admin auth layout corner, same component as dashboard topbar. |
| Q11 Shared `packages/ui` / `ui-mobile` components | Audit in phase 0; no hardcoded user copy allowed. Components accept text via props. |

Phase 0 starts now.
