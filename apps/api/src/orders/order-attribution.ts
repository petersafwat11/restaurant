import { HEARD_ABOUT_US_OPTIONS, type HeardAboutUs, type OrderAttributionDto } from '@repo/types';

export interface OrderAttributionColumns {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrerHost: string | null;
  landingPath: string | null;
  heardAboutUs: string | null;
}

const EMPTY: OrderAttributionColumns = {
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  referrerHost: null,
  landingPath: null,
  heardAboutUs: null,
};

/** Keep only a bare, lower-cased hostname; anything else is dropped. */
function normalizeHost(value: string | null | undefined): string | null {
  if (!value) return null;
  let host = value.trim().toLowerCase();
  if (host.includes('://')) {
    try {
      host = new URL(host).hostname;
    } catch {
      return null;
    }
  }
  host = host.split(/[/?#:]/)[0] ?? '';
  return /^[a-z0-9.-]{1,253}$/.test(host) ? host : null;
}

/** Keep only the pathname — never a query string or fragment (may hold PII). */
function normalizePath(value: string | null | undefined): string | null {
  if (!value) return null;
  const path = value.split(/[?#]/)[0]?.trim() ?? '';
  if (!path.startsWith('/')) return null;
  return path.slice(0, 300);
}

/** Map the (already Zod-sanitized) client attribution onto Order columns. */
export function attributionToColumns(
  input: OrderAttributionDto | undefined | null,
): OrderAttributionColumns {
  if (!input) return EMPTY;
  return {
    utmSource: input.utmSource ?? null,
    utmMedium: input.utmMedium ?? null,
    utmCampaign: input.utmCampaign ?? null,
    referrerHost: normalizeHost(input.referrerHost),
    landingPath: normalizePath(input.landingPath),
    heardAboutUs: input.heardAboutUs ?? null,
  };
}

/** Staff-facing DTO block; null when nothing was captured. */
export function columnsToAttribution(row: OrderAttributionColumns) {
  const heard = (HEARD_ABOUT_US_OPTIONS as readonly string[]).includes(row.heardAboutUs ?? '')
    ? (row.heardAboutUs as HeardAboutUs)
    : null;
  const out = {
    utmSource: row.utmSource,
    utmMedium: row.utmMedium,
    utmCampaign: row.utmCampaign,
    referrerHost: row.referrerHost,
    landingPath: row.landingPath,
    heardAboutUs: heard,
  };
  return Object.values(out).some((v) => v !== null) ? out : null;
}
