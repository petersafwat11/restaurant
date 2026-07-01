import {
  DELIVERY_SECTIONS,
  DeliveryEN,
  type DeliveryFacts,
  DeliveryPL,
} from '@/content/legal/delivery-cancellation';
import { PRIVACY_SECTIONS, PrivacyEN, PrivacyPL } from '@/content/legal/privacy';
import { REFUNDS_SECTIONS, RefundsEN, RefundsPL } from '@/content/legal/refunds-complaints';
import { type MinsRange, TERMS_SECTIONS, TermsEN, TermsPL } from '@/content/legal/terms';
import { type CompanyInfo, getCompanyInfo } from '@/features/legal/company';
import type { LegalSection } from '@/features/legal/legal-toc';
import { hoursToRows } from '@/features/restaurants/lib/restaurant-info';
import type { RestaurantPublicDto } from '@repo/types';
import { LEGAL_BUNDLE_DOCUMENTS, LEGAL_BUNDLE_VERSION } from '@repo/types';
import { formatMoney } from '@repo/utils';
import type { ReactNode } from 'react';

/**
 * Manifest of the documents that make up the accepted legal bundle
 * (`LEGAL_BUNDLE_DOCUMENTS` from @repo/types: terms, privacy,
 * refunds-complaints, delivery-cancellation). Drives the versioned archive route
 * (`/legal/archive/{version}/{document}`) so a snapshot of any bundle doc can be
 * rendered for audit/support (plan §C3/§D1).
 *
 * Cookies and promotion-terms are legal pages too, but they are NOT part of the
 * accepted order bundle, so they are intentionally excluded here.
 *
 * Only one version exists today, so the archive is a scaffold: it serves the
 * current version and 404s anything else. Per-document SHA-256 hashing lives in
 * @repo/types (frozen) and is deferred — it is not part of this slice.
 */

export type LegalBundleDocument = (typeof LEGAL_BUNDLE_DOCUMENTS)[number];

/** i18n title key (under the `web.legal` namespace) for each bundle doc. */
const TITLE_KEY: Record<LegalBundleDocument, string> = {
  terms: 'terms.title',
  privacy: 'privacy.title',
  'refunds-complaints': 'refundsComplaints.title',
  'delivery-cancellation': 'deliveryCancellation.title',
};

const SECTIONS: Record<LegalBundleDocument, LegalSection[]> = {
  terms: TERMS_SECTIONS,
  privacy: PRIVACY_SECTIONS,
  'refunds-complaints': REFUNDS_SECTIONS,
  'delivery-cancellation': DELIVERY_SECTIONS,
};

/** Indicative order-ready range (minutes) → typed range or null. */
function toMinsRange(min: number | null, max: number | null): MinsRange | null {
  return min != null ? { min, max } : null;
}

function fmtMinsRange(r: MinsRange): string {
  return r.max != null && r.max !== r.min ? `${r.min}–${r.max}` : `${r.min}`;
}

/**
 * Build the current, DB-backed delivery facts for the delivery-cancellation
 * page. Money is formatted with `formatMoney` (display only — chargeable money
 * is never recomputed on the client). `dayLabels`/`closedLabel` come from i18n
 * and are passed in by the caller (server component with `getTranslations`).
 */
export function buildDeliveryFacts(
  r: RestaurantPublicDto | null,
  c: CompanyInfo,
  dayLabels: string[],
  closedLabel: string,
): DeliveryFacts {
  const currency = r?.currency ?? 'PLN';
  const deliveryRange = toMinsRange(
    r?.estimatedDeliveryMinutesMin ?? null,
    r?.estimatedDeliveryMinutesMax ?? null,
  );
  const pickupRange = toMinsRange(
    r?.estimatedPickupMinutesMin ?? null,
    r?.estimatedPickupMinutesMax ?? null,
  );
  return {
    addressLines: c.tradingAddressLines,
    channels: {
      delivery: r?.acceptsDelivery ?? true,
      pickup: r?.acceptsPickup ?? true,
      dineIn: r?.acceptsDineIn ?? true,
    },
    deliveryRadiusKm: r?.deliveryRadiusKm ?? 0,
    deliveryFee: formatMoney(r?.defaultDeliveryFee ?? '0', currency),
    minOrder: formatMoney(r?.minOrderAmount ?? '0', currency),
    deliveryEta: deliveryRange ? fmtMinsRange(deliveryRange) : null,
    pickupEta: pickupRange ? fmtMinsRange(pickupRange) : null,
    hours: r?.hours && r.hours.length > 0 ? hoursToRows(r.hours) : null,
    dayLabels,
    closedLabel,
  };
}

export interface RenderBundleArgs {
  restaurant: RestaurantPublicDto | null;
  locale: string;
  dayLabels: string[];
  closedLabel: string;
}

/** Title i18n key for a bundle document (under `web.legal`). */
export function bundleTitleKey(doc: LegalBundleDocument): string {
  return TITLE_KEY[doc];
}

/** Section list for a bundle document (drives the TOC + PL/EN parity). */
export function bundleSections(doc: LegalBundleDocument): LegalSection[] {
  return SECTIONS[doc];
}

/** Whether `doc` is a known bundle document (used by the archive route). */
export function isBundleDocument(doc: string): doc is LegalBundleDocument {
  return (LEGAL_BUNDLE_DOCUMENTS as readonly string[]).includes(doc);
}

/**
 * Render a bundle document's body for the given locale, injecting DB facts.
 * Shared by the live pages and the versioned archive route so they never drift.
 */
export function renderBundleBody(doc: LegalBundleDocument, args: RenderBundleArgs): ReactNode {
  const c = getCompanyInfo(args.restaurant);
  const isPl = args.locale === 'pl';
  switch (doc) {
    case 'terms': {
      const delivery = toMinsRange(
        args.restaurant?.estimatedDeliveryMinutesMin ?? null,
        args.restaurant?.estimatedDeliveryMinutesMax ?? null,
      );
      const pickup = toMinsRange(
        args.restaurant?.estimatedPickupMinutesMin ?? null,
        args.restaurant?.estimatedPickupMinutesMax ?? null,
      );
      return isPl ? (
        <TermsPL c={c} delivery={delivery} pickup={pickup} />
      ) : (
        <TermsEN c={c} delivery={delivery} pickup={pickup} />
      );
    }
    case 'privacy':
      return isPl ? <PrivacyPL c={c} /> : <PrivacyEN c={c} />;
    case 'refunds-complaints':
      return isPl ? <RefundsPL c={c} /> : <RefundsEN c={c} />;
    case 'delivery-cancellation': {
      const f = buildDeliveryFacts(args.restaurant, c, args.dayLabels, args.closedLabel);
      return isPl ? <DeliveryPL f={f} /> : <DeliveryEN f={f} />;
    }
  }
}

export { LEGAL_BUNDLE_DOCUMENTS, LEGAL_BUNDLE_VERSION };
