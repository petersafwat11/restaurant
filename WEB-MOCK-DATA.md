# Web (customer side) — mock / dummy data audit

**Date:** 2026-06-21
**Scope:** `apps/web` (the customer website). Admin app not included.

This lists every piece of placeholder / dummy / hardcoded data on the customer site, split into:

- **A. Already live from the DB** — no action needed.
- **B. Wired to the DB in this pass** — now pulls real data.
- **C. NEEDS YOUR INPUT** — there is no DB source (or the field is empty and only you know the value). **Fill in the blanks at the bottom** and I'll apply them.
- **D. Functional stubs** — things that look real but don't actually do anything yet.

---

## A. Already live from the DB (no action needed)

| Data | Where it shows | Source |
|---|---|---|
| Opening hours (incl. "closed" days) | Footer, landing "Find us", hero "open now / closes at" | `OperatingHours` table → `restaurant.hours` |
| Address, ZIP, city | Footer, landing, contact page | `Restaurant.address` |
| Phone, email | Footer, landing, contact page | `Restaurant.phone` / `.email` |
| Map "Get directions" link | Landing, contact | `Restaurant.geoPoint` (falls back to address search) |
| Featured dishes | Landing "Our favourites" | Menu items flagged `isFeatured` (`useMenuTree`) |
| Customer reviews / testimonials | Landing "Trusted by…" | Reviews API (`useReviews`) — shows 3 recent ≥4★ |
| About-page rating stat | `/about` third stat card | Real review aggregate (falls back to static text — see C1) |
| Menu items, prices, photos, grams | `/menu`, featured strip, category strip | Menu tables (`useMenuTree`); photos are admin-uploaded |

> Featured dishes & testimonials keep a **last-resort mock fallback** (in `apps/web/src/lib/mock/szef-donald.ts`) that only renders if the DB has **zero** featured items / **fewer than 3** reviews. With your real data it never shows. The fallback images are Unsplash stock and the quotes are samples — listed here only so you know they exist.

---

## B. Wired to the DB in this pass

| Data | Where | Now sourced from |
|---|---|---|
| **"What we serve" category strip** | Landing | Live menu tree — real category **names**, **item counts**, and **images** (`category.imageUrl`, falling back to the first item photo). Previously a hardcoded list of 5 fake categories (kebab/falafel/tacos/box/drinks) with Unsplash images and made-up counts. — `apps/web/src/features/landing/sections/categories.tsx` |
| **Footer social links** | Footer | `Restaurant.sameAs` (set in admin). Renders an icon per URL (Instagram / Facebook / generic). Previously hardcoded Instagram + Facebook icons linking to `#`. **Currently shows nothing because `sameAs` is empty — see C-11.** — `apps/web/src/components/site-footer-szef.tsx` |

---

## C. NEEDS YOUR INPUT (no DB source — tell me what to use)

### C-1. Homepage hero rating — "4.8 ★ (1,247 reviews)"
- **File:** `apps/web/src/features/landing/sections/hero.tsx` (≈ line 23) — hardcoded `value: 4.8, count: 1247`.
- **Issue:** This is a made-up number. The `/about` page already shows the **real** review aggregate automatically; the hero does not.
- **Your call:** (a) use the real internal-review aggregate on the hero too (honest, but you currently have only a few reviews), **or** (b) give me your real Google rating + review count to display, **or** (c) remove the rating from the hero.

### C-2. Homepage hero image
- **File:** `apps/web/src/features/landing/sections/hero.tsx` (≈ line 34) — Unsplash stock photo.
- **Need:** A real hero photo (your food / interior). Give me an image URL or file, **or** I can wire it to a "cover image" you upload in admin.

### C-3. Story section image (homepage)
- **File:** `apps/web/src/features/landing/sections/story.tsx` (≈ line 43) — Unsplash stock photo.
- **Need:** A real photo (kitchen / grill / team).

### C-4. About page image
- **File:** `apps/web/src/app/[locale]/(marketing)/about/page.tsx` (≈ line 108) — Unsplash stock photo.
- **Need:** A real photo.

### C-5. "~1,200 wraps / week" stat
- **Files:** `packages/i18n/messages/{en,pl}/web/marketing/home.json` (`story.wrapsValue`) and `…/about.json` (`stats.wrapsValue`).
- **Need:** The real number, **or** tell me to remove this stat.

### C-6. Landing map transit annotations — "Tram · 2 min walk" / "Metro · 5 min walk"
- **Files:** `packages/i18n/messages/{en,pl}/web/marketing/home.json` (`hoursLocation.tramAnnotation` / `metroAnnotation`).
- **Note:** The landing "map" is a **stylized illustration**, not a real map, and Kielce has **no metro** — so the "Metro" label is wrong.
- **Your call:** give me the real nearby transit text, **or** tell me to remove the annotations, **or** I can replace the illustration with a real embedded map (like the delivery-zone map).

### C-7. Footer legal links — Privacy / Terms / Cookies
- **File:** `apps/web/src/components/site-footer-szef.tsx` (bottom `legal` array, all `href="#"`).
- **Need:** Real URLs, **or** tell me to create these pages (I'd need the policy text), **or** remove them.

### C-8. Checkout terms / privacy links
- **File:** `apps/web/src/features/checkout/components/checkout-app.tsx` (≈ lines 958, 963, `href="#"`).
- **Need:** Same as C-7 — point them at the real policy pages.

### C-9. Testimonials "Read all reviews" link
- **File:** `apps/web/src/features/landing/sections/testimonials.tsx` (≈ line 69, `href="#"`).
- **Need:** Your Google/Maps reviews URL, **or** tell me to build an in-app reviews page, **or** remove the link.

### C-10. Category images (optional polish)
- The category strip (section B) now uses each category's own image if set, otherwise a menu-item photo. To control them precisely, upload a **category image** per category in admin. Otherwise no action needed.

### C-11. Social profile URLs
- The footer social icons now come from `Restaurant.sameAs` (empty today). Add your **Instagram / Facebook / etc. URLs** in admin (restaurant settings), or give them to me and I'll seed them.

### C-12. Menu / dish photos
- These come from the DB and are **admin-uploaded**. The currently seeded photos are samples — replace them per item in admin. (No code change needed.)

---

## D. Functional stubs (look real, don't work yet)

### D-1. Newsletter signup
- **File:** `apps/web/src/features/landing/sections/newsletter.tsx` (≈ line 23) — `onSubmit` just waits 600 ms and resolves. **Nobody is actually subscribed.**
- **Your call:** wire it to a real provider/endpoint (Mailchimp, Resend audience, a DB table, …), or remove the section.
- The same section's heading promises **"free baklava on first order"** (`home.json` → `newsletter.*`) — confirm that's a real offer or change the copy.

### D-2. Minor: duplicate-review-key warning
- The testimonials list keys cards by author **name**; two reviewers with the same name throw a React "duplicate key" warning (seen in dev console as "Casey"). Low priority — I can switch the key to the review ID. Not user-facing.

---

## Fill-in sheet (reply with whatever you have; blanks are fine)

```
C-1  Hero rating:        [ real-aggregate / use 4.8 & 1247 / other: ____ / remove ]
C-2  Hero image:         [ URL or file: ________ ]
C-3  Story image:        [ URL or file: ________ ]
C-4  About image:        [ URL or file: ________ ]
C-5  Wraps/week stat:    [ number: ____ / remove ]
C-6  Map transit text:   [ text: ________ / remove / use a real map ]
C-7  Privacy URL:        [ ________ ]   Terms URL: [ ________ ]   Cookies URL: [ ________ ]
C-9  Reviews link:       [ Google URL: ________ / build a page / remove ]
C-11 Social URLs:        [ Instagram: ____  Facebook: ____  Other: ____ ]
D-1  Newsletter:         [ provider/endpoint: ________ / remove ]   Baklava offer real? [ yes / no ]
```
