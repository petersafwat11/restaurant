# Legal pages — EU / Poland compliance analysis & required flow changes

**Scope:** the customer site (`apps/web`) + the data/flows behind it, for a restaurant ordering business based in **Kielce, Poland** (EU).
**Date:** 2026-06-21.

> ⚠️ **Not legal advice.** I'm an engineer, not a lawyer. This is an honest, codebase-grounded map of what EU/PL rules expect vs. what the app does today, so you can brief a Polish lawyer (radca prawny) efficiently. Have the final wording reviewed before publishing — especially the Regulamin and Privacy Policy.

The applicable rules for an online food shop in Poland:
- **GDPR / RODO** — Reg. (EU) 2016/679 (data protection).
- **ePrivacy / cookies** — Polish *Prawo telekomunikacyjne* art. 173 (consent for non-essential cookies).
- **Electronic services** — *Ustawa o świadczeniu usług drogą elektroniczną* (UŚUDE) — requires a **Regulamin**.
- **Consumer law** — *Ustawa o prawach konsumenta* (implements Dir. 2011/83) — distance selling, withdrawal, complaints.
- **Food information** — Reg. (EU) **1169/2011 (FIC)** — mandatory **allergen** info, incl. distance/online sales.
- **Anti-spam / marketing** — UŚUDE art. 10 + Prawo telekomunikacyjne art. 172 — prior opt-in for marketing.

---

## TL;DR — gap summary

| # | Topic | Standard | Today | Severity | Type |
|---|---|---|---|---|---|
| 1 | **Allergens** on menu items | FIC 1169/2011 — 14 allergens must be available **before** ordering | Only veg/vegan/GF flags; `allergens` field exists in UI but no DB field/admin input | 🔴 High | **Flow change** |
| 2 | Legal pages exist & linked | Privacy + Regulamin + Cookies required/expected | None; footer + checkout link to `#` | 🔴 High | Build pages |
| 3 | Newsletter marketing consent | Prior **opt-in** (unticked checkbox), record consent | Form takes email only, **no consent box**, and is a **no-op stub** | 🔴 High | **Flow change** |
| 4 | Right-to-erasure (delete account) | GDPR Art. 17 — must honour erasure | No self-serve "delete my account" found | 🟠 Med | **Flow change** |
| 5 | International transfers disclosure + DPAs | GDPR Ch. V — US processors need safeguards (SCCs/DPF) + Art. 28 DPAs | Uses Stripe, Resend, Twilio, Expo (US) — not disclosed; DPAs unknown | 🟠 Med | Doc + ops |
| 6 | Withdrawal-right exemption wording | Consumer Act art. 38 — food & dated services exempt; must still inform | Not stated anywhere | 🟠 Med | Content |
| 7 | Cookie consent banner | Needed **only** for non-essential cookies | Only essential cookies today → **banner NOT required now** ✅ | 🟢 OK* | Conditional |
| 8 | Business identity (REGON/KRS) | Regulamin must identify the seller | NIP shown in footer; REGON/KRS missing | 🟡 Low | Content/data |
| 9 | ODR platform link | Online traders must link the EU ODR platform | Missing | 🟡 Low | Content |

\* Stays "OK" only while the site uses no analytics/marketing cookies — see §7.

---

## 1. 🔴 Allergens (FIC 1169/2011) — the biggest gap

**Standard:** Selling prepared food at a distance (online) in the EU, the **14 major allergens** (gluten, crustaceans, eggs, fish, peanuts, soy, milk, nuts, celery, mustard, sesame, sulphites, lupin, molluscs) must be communicated to the customer **before they conclude the purchase**, free of charge.

**Today:** Menu items have dietary *flags* (vegetarian / vegan / gluten-free) and the item detail sheet has an `allergens?: string[]` prop — but there is **no `allergens` field in the DB / Zod schema / admin form**, so it's always empty. Veg/GF flags are **not** a substitute for the allergen declaration.

**What to change in our flow:**
1. **DB:** add `allergens String[]` (or a join table) to `MenuItem` — mirror how we just added `grams`.
2. **Types:** add `allergens` to the menu Zod schemas.
3. **Admin:** add an allergen multi-select to the item editor (14 EU allergens as fixed options).
4. **Web:** display allergens on the dish card / item detail sheet **before add-to-cart** (the sheet already has the slot).
5. Add a short "allergen disclaimer" line (cross-contamination) — content.

This is the one item I'd prioritise: it's a real food-safety legal duty, not just paperwork.

## 2. 🔴 The pages themselves

Build Privacy, **Regulamin** (this is the PL term for Terms — it's effectively mandatory under UŚUDE art. 8), and Cookie Policy per `spec.md`. Then wire the links that are currently `#`:
- Footer: `apps/web/src/components/site-footer-szef.tsx` (bottom `legal` array).
- Checkout: `apps/web/src/features/checkout/components/checkout-app.tsx` (≈ lines 958/963) — and the checkout should require the customer to **accept the Regulamin** (a checkbox) before paying.

**Flow change:** add a "I accept the Regulamin and Privacy Policy" checkbox to checkout (linked), and record acceptance with the order.

## 3. 🔴 Newsletter marketing consent

**Standard:** Marketing email requires **prior, specific, freely-given opt-in** (GDPR + UŚUDE art. 10). The consent box must be **unticked by default**, separate from accepting the Regulamin, with a clear purpose. Double opt-in (confirmation email) is best practice.

**Today:** The newsletter form (`apps/web/src/features/landing/sections/newsletter.tsx`) collects an email with **no consent checkbox** and `onSubmit` is a **stub that does nothing** (no storage, no provider).

**What to change:** add an explicit consent checkbox + purpose text; store the subscriber + consent timestamp/source (new table or a provider like Resend Audiences/Mailchimp); ideally double opt-in; provide one-click unsubscribe in every marketing email. Until that exists, either build it or remove the newsletter section (it currently misleads — it looks like it subscribes you but doesn't).

> Note: **transactional** emails (order confirmation, password reset) are fine under "contract performance" and need **no** marketing consent — only promotional emails do.

## 4. 🟠 Right to erasure / delete account

**Standard:** GDPR Art. 17 — users can request deletion of their personal data (with lawful exceptions, e.g. keeping invoices for tax).

**Today:** No self-serve "delete my account" found in the account area.

**What to change:** add an account-deletion flow (or a clearly documented manual request route via the contact/email channel) that erases/anonymises personal data while retaining what tax law requires (anonymised order/invoice records). Document the retention exceptions in the Privacy Policy.

## 5. 🟠 Processors & international transfers

**Today (from the code):** personal data is shared with **Stripe** (payments — card data is tokenised, never stored by us ✅), **Resend** (email), **Twilio** (SMS), **Expo** (push), our **hosting** (Contabo, EU), and **OpenStreetMap/Nominatim** (address search + the new map; no account data). Several (Stripe, Resend, Twilio, Expo) are **US-based** → GDPR Chapter V transfers.

**What to change:**
- **Disclose** each processor + the transfer + safeguard (Standard Contractual Clauses / EU-US Data Privacy Framework) in the Privacy Policy.
- **Operationally:** sign an Art. 28 **Data Processing Agreement** with each (Stripe/Resend/Twilio/Expo all offer one). No code change, but required.
- Good news: payments are tokenised (CLAUDE.md rule "never store card data") — so PCI scope is minimal.

## 6. 🟠 Withdrawal right (and its exemptions)

**Standard:** Distance sales normally carry a 14-day withdrawal right — **but** the Consumer Rights Act art. 38 **exempts**: perishable/prepared food, and services for a **specific date** (e.g. a table reservation). You must still **inform** customers that the 14-day right does **not** apply here, and provide a **complaints (reklamacja / rękojmia)** path for defective orders.

**What to change:** state this clearly in the Regulamin (§8/§9 in the spec). No app change needed beyond content + a complaints contact.

## 7. 🟢 Cookies — currently compliant *without* a banner (keep it that way)

**Finding (verified in code):** the app sets only:
- `web_at`, `web_rt` (auth — strictly necessary), `cart_session` (guest cart — strictly necessary), `NEXT_LOCALE` (language — functional).
- **No analytics or marketing cookies.** Our analytics (PostHog) runs **server-side only and sets no cookies**. The location map now uses **OpenStreetMap** (no tracking cookies) instead of Google Maps.

**Conclusion:** under ePrivacy, a **consent banner is NOT legally required today** — strictly-necessary/functional cookies are exempt. You still need the **Cookie Policy page** (transparency). This is a genuinely good position; don't add a cookie banner you don't need.

**⚠️ The moment this flips:** if you later add Google Analytics, Meta Pixel, a Google Maps embed, YouTube embeds, or PostHog's browser SDK — those set non-essential cookies and you **must** add a **prior-consent banner** (opt-in, with reject = as easy as accept, no pre-ticked boxes). Keep that in mind before adding any "marketing tag".

## 8. 🟡 Business identity

Footer shows `Szef Donald sp. z o.o. · NIP 6572959741`. A **sp. z o.o.** must also state **KRS** number and registry court, and **REGON**, in the Regulamin. These aren't in the DB.

**What to change:** add a small "Company / legal entity" group to admin restaurant settings (KRS, REGON, legal name, registered address) so the legal pages can render them from one source — **or** hardcode them in the legal MDX (simpler, since they rarely change). I recommend the settings group so the footer + all pages stay consistent.

## 9. 🟡 ODR platform

**Standard:** Online traders in the EU must provide an electronic link to the EU **Online Dispute Resolution** platform and mention out-of-court resolution.
*(Note: the EU ODR platform is being wound down in 2025 — confirm the current requirement/replacement with your lawyer; at minimum reference the Polish out-of-court consumer dispute bodies / UOKiK.)*

**What to change:** a line + link in the Regulamin §11. Content only.

---

## Suggested order of work

1. **Allergens** (#1) — food-safety duty; touches DB→admin→web (same shape as the `grams` change). 
2. **Build the 3 pages** (#2) per `spec.md` + wire footer/checkout links + **Regulamin-acceptance checkbox** at checkout.
3. **Newsletter consent** (#3) — or remove the section until it's real.
4. **Account deletion** (#4) + **retention** wording.
5. Content/ops: transfers + DPAs (#5), withdrawal wording (#6), company identity (#8), ODR (#9).
6. Keep cookies banner-free (#7) — revisit only if you add tracking.

## What I need from you to draft the actual page text
- Company legal details: **KRS**, **REGON**, registered address, legal contact email (for data requests / DPO if any).
- Confirm processors in use in production (Stripe? which email/SMS providers are live?).
- Whether you sell **alcohol** (if yes, age-verification + license disclosure are extra requirements — not currently handled).
- Who reviews/approves the final legal copy (lawyer).
