import type { RestaurantPublicDto } from '@repo/types';

export interface CompanyInfo {
  legalName: string;
  tradeName: string;
  addressLines: string[];
  nip: string;
  krs: string;
  regon: string;
  email: string;
  phone: string;
}

// Company-registration fields that don't live in the DB. NIP is known; KRS and
// REGON must be filled from the company's entry in the Polish KRS register.
// (See design-assets/web/legal/EU-COMPLIANCE.md §8.)
const NIP = '6572959741';
const KRS = '[KRS — uzupełnij]';
const REGON = '[REGON — uzupełnij]';

/** Build the legal entity block, sourcing address/contact from the DB when available. */
export function getCompanyInfo(r: RestaurantPublicDto | null): CompanyInfo {
  const tradeName = r?.name ?? 'Szef Donald';
  const addressLines = r
    ? [r.address.line1, [r.address.zip, r.address.city].filter(Boolean).join(' '), 'Polska']
    : ['ul. Ks. Piotra Ściegiennego 68a', '25-115 Kielce', 'Polska'];
  return {
    legalName: `${tradeName} sp. z o.o.`,
    tradeName,
    addressLines,
    nip: NIP,
    krs: KRS,
    regon: REGON,
    email: r?.email ?? 'kontakt@szefdonald.pl',
    phone: r?.phone ?? '',
  };
}

/** ISO date the current legal copy was last revised. Bump on every edit. */
export const LEGAL_LAST_UPDATED = '2026-06-24';
