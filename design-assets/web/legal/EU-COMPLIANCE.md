# Legal pages — EU / Poland compliance analysis & required flow changes

**Scope:** the customer site (`apps/web`) + the data/flows behind it, for a restaurant ordering business based in **Kielce, Poland** (EU).
**Date:** 2026-06-21.

> ⚠️ **Not legal advice.** I'm an engineer, not a lawyer. This is an honest, codebase-grounded map of what EU/PL rules expect vs. what the app does today, so you can brief a Polish lawyer (radca prawny) efficiently. Have the final wording reviewed before publishing — especially the Regulamin and Privacy Policy.

The applicable rules for an online food shop in Poland:
- **GDPR / RODO** — Reg. (EU) 2016/679 (data protection).
- **ePrivacy / cookies** — Polish **Prawo komunikacji elektronicznej (PKE)** — the Electronic Communications Law, in force since Nov 2024, which **replaced** the old *Prawo telekomunikacyjne* art. 173 as the legal basis for consent to non-essential cookies/terminal-device storage. (Confirm the current PKE article with counsel.)
- **Electronic services** — *Ustawa o świadczeniu usług drogą elektroniczną* (UŚUDE) — requires a **Regulamin**.
- **Consumer law** — *Ustawa o prawach konsumenta* (implements Dir. 2011/83) — distance selling, withdrawal, complaints.
- **Food information** — Reg. (EU) **1169/2011 (FIC)** — mandatory **allergen** info, incl. distance/online sales.
- **Anti-spam / marketing** — UŚUDE art. 10 + **PKE** (direct-marketing consent, formerly *Prawo telekomunikacyjne* art. 172) — prior opt-in for marketing.

---

## TL;DR — gap summary

| # | Topic | Standard | Today | Severity | Type |
|---|---|---|---|---|---|
| 1 | **Allergens** on menu items | FIC 1169/2011 — 14 allergens must be available **before** ordering | ✅ **Implemented** — `allergens` in DB/Zod/admin item editor + shown on the dish before add-to-cart | 🟢 Done | (was flow change) |
| 2 | Legal pages exist & linked | Privacy + Regulamin + Cookies required/expected | ✅ **Implemented** — `/privacy`, `/terms` (+ cookies) built and linked from footer + checkout; checkout records a server-side legal-acceptance snapshot. (Final binding prose still needs lawyer sign-off.) | 🟢 Done | Build pages |
| 3 | Newsletter marketing consent | Prior **opt-in** (unticked checkbox), record consent | ✅ **Implemented** — explicit consent + **double opt-in** (confirmation email); subscriber + consent timestamp stored | 🟢 Done | (was flow change) |
| 4 | Right-to-erasure (delete account) | GDPR Art. 17 — must honour erasure | ❌ Still missing — no self-serve "delete my account" yet (Slice 9, not built) | 🟠 Med | **Flow change** |
| 5 | International transfers disclosure + DPAs | GDPR Ch. V — US processors need safeguards (SCCs/DPF) + Art. 28 DPAs | Uses Stripe, Resend, Twilio (US) — disclose + sign DPAs. (Expo removed.) | 🟠 Med | Doc + ops |
| 6 | Withdrawal-right exemption wording | Consumer Act art. 38 — food & dated services exempt; must still inform | Covered in the Terms/Regulamin structure; final wording lawyer-gated | 🟠 Med | Content |
| 7 | Cookie consent banner | Needed **only** for non-essential cookies | Only essential cookies today → **banner NOT required now** ✅ (revisit when Stripe Elements goes live — see §7) | 🟢 OK* | Conditional |
| 8 | Business identity (REGON/KRS) | Regulamin must identify the seller | Legal-entity DB fields + admin section now exist (legalName/NIP/REGON/KRS/court/capital); **owner must still enter & verify** the values (currently NULL except NIP) | 🟡 Low | Content/data |
| 9 | ODR platform link | (Old rule) link the EU ODR platform | ⚠️ **Rule changed — the EU ODR platform closed 20 July 2025.** Do **not** link it; reference Polish out-of-court ADR bodies / UOKiK instead | 🟡 Low | Content |

\* Stays "OK" only while the site uses no analytics/marketing cookies — see §7.

---

## 1. ✅ Allergens (FIC 1169/2011) — implemented

**Standard:** Selling prepared food at a distance (online) in the EU, the **14 major allergens** (gluten, crustaceans, eggs, fish, peanuts, soy, milk, nuts, celery, mustard, sesame, sulphites, lupin, molluscs) must be communicated to the customer **before they conclude the purchase**, free of charge.

**Status (done):** `allergens` now exists on `MenuItem` in the DB + the menu Zod schemas; the admin item editor has an allergen multi-select (the 14 EU allergens as fixed options); and the web dish card / item detail sheet shows allergens **before add-to-cart**.

**Remaining (content only):** keep an "allergen disclaimer" line (cross-contamination) reviewed by the owner/lawyer.

## 2. ✅ The pages themselves — implemented (prose pending lawyer)

Privacy, **Regulamin** (the PL term for Terms — effectively mandatory under UŚUDE art. 8), and the Cookie Policy now exist as pages and the footer + checkout links point to them (no longer `#`). Checkout requires the customer to accept the Regulamin/Privacy and records a **server-generated legal-acceptance snapshot + hash** with the order (not just a client timestamp).

**Remaining:** the binding PL/EN legal *wording* must still be approved by a Polish lawyer before production publication. The seller-identity block on these pages renders from the DB legal fields (§8), so it stays consistent once the owner populates them.

## 3. ✅ Newsletter marketing consent — implemented (double opt-in)

**Standard:** Marketing email requires **prior, specific, freely-given opt-in** (GDPR + UŚUDE art. 10). The consent box must be **unticked by default**, separate from accepting the Regulamin, with a clear purpose. Double opt-in (confirmation email) is best practice.

**Status (done):** the newsletter flow now captures explicit consent and uses **double opt-in** (a confirmation email), and stores the subscriber together with the consent timestamp/source. It is no longer a no-op stub.

**Remaining:** ensure every marketing email carries a one-click unsubscribe and that the purpose text is owner/lawyer-approved.

> Note: **transactional** emails (order confirmation, password reset) are fine under "contract performance" and need **no** marketing consent — only promotional emails do.

## 4. 🟠 Right to erasure / delete account

**Standard:** GDPR Art. 17 — users can request deletion of their personal data (with lawful exceptions, e.g. keeping invoices for tax).

**Today (still a gap):** No self-serve "delete my account" exists yet. This is planned but **not built** (the deletion/anonymisation workflow is a later slice and depends on an accountant/lawyer-approved retention matrix).

**What to change:** add an account-deletion flow (or a clearly documented manual request route via the contact/email channel) that erases/anonymises personal data while retaining what tax law requires (anonymised order/invoice records). Document the retention exceptions in the Privacy Policy.

## 5. 🟠 Processors & international transfers

**Today (from the code):** personal data is shared with **Stripe** (payments — card data is tokenised, never stored by us ✅), **Resend** (email), **Twilio** (SMS), our **hosting** (Contabo, EU), and **OpenStreetMap/Nominatim** (address search + map; no account data). Stripe/Resend/Twilio are **US-based** → GDPR Chapter V transfers. (Expo is **no longer** a processor — the mobile app and its push channel were removed; notifications are in-app + email + SMS.)

**What to change:**
- **Disclose** each processor + the transfer + safeguard (Standard Contractual Clauses / EU-US Data Privacy Framework) in the Privacy Policy.
- **Operationally:** sign an Art. 28 **Data Processing Agreement** with each (Stripe/Resend/Twilio all offer one). No code change, but required.
- The processor register must reflect **actual production config** — uploads are local on the Contabo VPS (no Cloudflare R2); list Sentry/PostHog only if actually enabled.
- Good news: payments are tokenised (rule "never store card data") — so PCI scope is minimal.

## 6. 🟠 Withdrawal right (and its exemptions)

**Standard:** Distance sales normally carry a 14-day withdrawal right — **but** the Consumer Rights Act art. 38 **exempts**: perishable/prepared food, and services for a **specific date** (e.g. a table reservation). You must still **inform** customers that the 14-day right does **not** apply here, and provide a **complaints (reklamacja / rękojmia)** path for defective orders.

**What to change:** state this clearly in the Regulamin (§8/§9 in the spec). No app change needed beyond content + a complaints contact.

## 7. 🟢 Cookies — currently compliant *without* a banner (keep it that way)

**Finding (verified in code):** the app sets only:
- `web_at`, `web_rt` (auth — strictly necessary), `cart_session` (guest cart — strictly necessary), `NEXT_LOCALE` (language — functional).
- **No analytics or marketing cookies.** Our analytics (PostHog) runs **server-side only and sets no cookies**. The location map now uses **OpenStreetMap** (no tracking cookies) instead of Google Maps.

**Conclusion:** under the cookie/terminal-storage consent rule (now **PKE**, not the old *Prawo telekomunikacyjne*), a **consent banner is NOT legally required today** — strictly-necessary/functional cookies are exempt. You still need the **Cookie Policy page** (transparency). This is a genuinely good position; don't add a cookie banner you don't need.

**⚠️ The moment this flips:** if you later add Google Analytics, Meta Pixel, a Google Maps embed, YouTube embeds, or PostHog's browser SDK — those set non-essential cookies and you **must** add a **prior-consent banner** (opt-in, with reject = as easy as accept, no pre-ticked boxes). **Also revisit when Stripe Elements goes live** (it is currently behind a flag and off): Stripe.js/Elements/Link set fraud/session cookies (`__stripe_mid`, `__stripe_sid`, etc.). Run a clean-browser storage audit with Stripe enabled and have counsel classify those cookies under PKE before flipping the banner decision. (Do not re-decide the banner here — it's lawyer-gated.)

## 8. 🟡 Business identity

A **sp. z o.o.** must state its **legal name**, **KRS** number and registry court, **REGON**, and registered address in the Regulamin.

**Status (done — fields exist):** the admin restaurant settings now have a "Legal entity" + "Payments & customer support" section (legalName, NIP, REGON, KRS, registry court, share capital, registered address, support/complaints/privacy contacts, statement descriptor), and the footer + legal pages render the seller identity from those DB fields — no inferred `sp. z o.o.` name and no hardcoded NIP in code.

**Remaining (owner-gated):** the **owner must enter and verify** the actual values against an official current KRS extract. They are intentionally **NULL today** (except NIP); the candidate KRS/REGON/court/capital values in the engineering plan are **unverified** and must not be published until confirmed. Do not paste registry values into this doc.

## 9. 🟡 ODR platform — rule changed (do NOT link EU ODR)

**Update:** the EU **Online Dispute Resolution (ODR) platform closed on 20 July 2025.** The old obligation to link it no longer applies — and linking a dead platform is itself a defect. Do **not** add the EU ODR link.

**What to do instead:** in the Regulamin's dispute-resolution section, reference Poland's out-of-court consumer dispute resolution (ADR) — the **UOKiK** (Office of Competition and Consumer Protection) consumer-ADR information, the relevant **Wojewódzki Inspektorat Inspekcji Handlowej (WIIH)** / sector ADR body, and the municipal/district consumer ombudsman (rzecznik konsumentów). Confirm the exact bodies and wording with counsel. Content only.

---

## Remaining work (most engineering items now done)

Done: allergens (#1), the 3 legal pages + checkout acceptance snapshot (#2),
newsletter double opt-in (#3), legal-entity admin fields (#8). Still open:

1. **Account deletion / erasure** (#4) + **retention** wording — not built yet.
2. Content/ops: disclose transfers + sign DPAs (#5), withdrawal wording (#6),
   and the dispute-resolution section pointing at Polish ADR/UOKiK — **not** the
   closed EU ODR platform (#9).
3. Owner **enters & verifies** the legal-entity values (#8) against an official
   KRS extract (currently NULL except NIP).
4. Keep cookies banner-free (#7) — **revisit when Stripe Elements goes live**
   (lawyer-gated), not only for analytics tags.

## What's needed to finalise the page text
- Owner-verified company legal details: **legal name, KRS, REGON, registry
  court, share capital, registered address**, and the support / complaints /
  privacy contact addresses.
- Confirm the processors actually live in production (Stripe? Resend/SMTP?
  Twilio? Sentry/PostHog?). Uploads are local on Contabo (no R2). Expo/push is
  removed.
- Whether you sell **alcohol** (if yes, age-verification + license disclosure
  are extra requirements — not currently handled).
- A Polish lawyer (radca prawny) to review/approve the final legal copy.
