import type { RestaurantPublicDto } from '@repo/types';

export interface CompanyInfo {
  /** Verified legal entity name from the DB; null until the owner confirms it. */
  legalName: string | null;
  /** Public brand / trading name (restaurant.name). */
  tradeName: string;
  /** Safe display name for copyright etc. — legalName when set, else the brand. */
  displayName: string;
  /** Trading / fulfilment address (restaurant.address). */
  tradingAddressLines: string[];
  /** Registered (KRS) address when it differs from trading; null = same as trading. */
  registeredAddressLines: string[] | null;
  nip: string | null;
  krs: string | null;
  regon: string | null;
  registryCourt: string | null;
  shareCapital: string | null;
  shareCapitalCurrency: string | null;
  /** Primary contact (support) email — used for complaint/contact mailto links. */
  email: string | null;
  phone: string | null;
  supportEmail: string | null;
  complaintsEmail: string | null;
  privacyEmail: string | null;
}

function addressLines(a: { line1: string; zip?: string | null; city: string }): string[] {
  return [a.line1, [a.zip, a.city].filter(Boolean).join(' '), 'Polska'];
}

/**
 * Build the legal entity block strictly from DB-managed data. There is no
 * inferred legal name and no hardcoded registry number — every identity value
 * comes from the `Restaurant.legal` block managed in admin. Missing values are
 * returned as `null` so consumers omit them rather than render placeholders.
 *
 * The owner populates these against an official current KRS extract before
 * Stripe go-live (see the admin "Payment provider readiness" check); until then
 * `displayName` falls back to the public brand name (never `${brand} sp. z o.o.`).
 */
export function getCompanyInfo(r: RestaurantPublicDto | null): CompanyInfo {
  const legal = r?.legal ?? null;
  const tradeName = r?.name ?? 'Szef Donald';
  const tradingAddressLines = r
    ? addressLines(r.address)
    : addressLines({ line1: 'ul. Ks. Piotra Ściegiennego 68a', zip: '25-115', city: 'Kielce' });
  const legalName = legal?.legalName ?? null;
  return {
    legalName,
    tradeName,
    displayName: legalName ?? tradeName,
    tradingAddressLines,
    registeredAddressLines: legal?.registeredAddress ? addressLines(legal.registeredAddress) : null,
    nip: legal?.nip ?? null,
    krs: legal?.krs ?? null,
    regon: legal?.regon ?? null,
    registryCourt: legal?.registryCourt ?? null,
    shareCapital: legal?.shareCapital ?? null,
    shareCapitalCurrency: legal?.shareCapitalCurrency ?? null,
    email: legal?.supportEmail ?? r?.email ?? null,
    phone: legal?.supportPhone ?? r?.phone ?? null,
    supportEmail: legal?.supportEmail ?? r?.email ?? null,
    complaintsEmail: legal?.complaintsEmail ?? null,
    privacyEmail: legal?.privacyEmail ?? null,
  };
}

/** ISO date the current legal copy was last revised. Bump on every edit. */
export const LEGAL_LAST_UPDATED = '2026-06-24';
