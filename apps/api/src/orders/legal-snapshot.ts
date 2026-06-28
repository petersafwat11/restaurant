import { createHash } from 'node:crypto';
import {
  LEGAL_BUNDLE_DOCUMENTS,
  LEGAL_BUNDLE_EFFECTIVE_DATE,
  LEGAL_BUNDLE_VERSION,
  type OrderLegalSnapshotDto,
} from '@repo/types';

type Address = Record<string, unknown> | null;

export interface LegalSnapshotInput {
  /** Server-set ISO acceptance timestamp — never client-chosen. */
  acceptedAt: string;
  locale: string;
  orderType: string;
  currency: string;
  restaurant: {
    name: string;
    address: Address;
    legalName: string | null;
    nip: string | null;
    krs: string | null;
    regon: string | null;
    registryCourt: string | null;
    shareCapital: string | null;
    shareCapitalCurrency: string | null;
    registeredAddress: Address;
    registeredAddressSameAsTrading: boolean;
    supportEmail: string | null;
    supportPhone: string | null;
    complaintsEmail: string | null;
    privacyEmail: string | null;
    defaultDeliveryFee: string;
    minOrderAmount: string;
    estimatedDeliveryMinutesMin: number | null;
    estimatedDeliveryMinutesMax: number | null;
    estimatedPickupMinutesMin: number | null;
    estimatedPickupMinutesMax: number | null;
  };
}

function minutesRange(min: number | null, max: number | null): { min: number; max: number } | null {
  return min != null && max != null ? { min, max } : null;
}

/**
 * Build the immutable legal-acceptance snapshot stored on `Order.legalSnapshot`
 * (plan §C2). Captures the exact legal/commercial context the customer accepted
 * so a historical order never depends on later admin edits. Pure + deterministic
 * for a given input, which makes it unit-testable and the hash reproducible.
 */
export function buildLegalSnapshot(input: LegalSnapshotInput): OrderLegalSnapshotDto {
  const r = input.restaurant;
  return {
    version: LEGAL_BUNDLE_VERSION,
    effectiveDate: LEGAL_BUNDLE_EFFECTIVE_DATE,
    acceptedAt: input.acceptedAt,
    locale: input.locale,
    documents: [...LEGAL_BUNDLE_DOCUMENTS],
    seller: {
      legalName: r.legalName,
      tradeName: r.name,
      nip: r.nip,
      krs: r.krs,
      regon: r.regon,
      registryCourt: r.registryCourt,
      shareCapital: r.shareCapital,
      shareCapitalCurrency: r.shareCapitalCurrency,
      tradingAddress: r.address,
      // Only capture a separate registered address when it actually differs.
      registeredAddress: r.registeredAddressSameAsTrading ? null : r.registeredAddress,
      supportEmail: r.supportEmail,
      supportPhone: r.supportPhone,
      complaintsEmail: r.complaintsEmail,
      privacyEmail: r.privacyEmail,
    },
    currency: input.currency,
    fulfilment: {
      type: input.orderType,
      deliveryFee: r.defaultDeliveryFee,
      minOrderAmount: r.minOrderAmount,
      estimatedDeliveryMinutes: minutesRange(
        r.estimatedDeliveryMinutesMin,
        r.estimatedDeliveryMinutesMax,
      ),
      estimatedPickupMinutes: minutesRange(
        r.estimatedPickupMinutesMin,
        r.estimatedPickupMinutesMax,
      ),
    },
  };
}

// Recursively sort object keys so the serialization (and therefore the hash) is
// stable regardless of property insertion order.
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalize((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

/** SHA-256 of the canonical snapshot JSON — the tamper-evident evidence hash. */
export function hashLegalSnapshot(snapshot: OrderLegalSnapshotDto): string {
  return createHash('sha256').update(JSON.stringify(canonicalize(snapshot))).digest('hex');
}
