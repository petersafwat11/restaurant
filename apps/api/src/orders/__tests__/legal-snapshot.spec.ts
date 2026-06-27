import { LEGAL_BUNDLE_VERSION } from '@repo/types';
import { describe, expect, it } from 'vitest';
import {
  buildLegalSnapshot,
  hashLegalSnapshot,
  type LegalSnapshotInput,
} from '../legal-snapshot';

const baseRestaurant: LegalSnapshotInput['restaurant'] = {
  name: 'Szef Donald',
  address: { line1: 'ul. Test 1', city: 'Kielce', country: 'PL' },
  legalName: 'CIOSEK SAMANTA SP. Z O.O.',
  nip: '6572959741',
  krs: '0000897286',
  regon: '388771662',
  registryCourt: 'Sąd Rejonowy w Kielcach',
  registeredAddress: { line1: 'ul. Inny 9', city: 'Kielce', country: 'PL' },
  registeredAddressSameAsTrading: true,
  supportEmail: 'support@szefdonald.pl',
  complaintsEmail: 'reklamacje@szefdonald.pl',
  privacyEmail: 'rodo@szefdonald.pl',
  defaultDeliveryFee: '8.00',
  minOrderAmount: '30.00',
  estimatedDeliveryMinutesMin: 30,
  estimatedDeliveryMinutesMax: 60,
  estimatedPickupMinutesMin: 15,
  estimatedPickupMinutesMax: 25,
};

const baseInput: LegalSnapshotInput = {
  acceptedAt: '2026-06-27T10:00:00.000Z',
  locale: 'pl',
  orderType: 'DELIVERY',
  currency: 'PLN',
  restaurant: baseRestaurant,
};

describe('buildLegalSnapshot', () => {
  it('captures the bundle version, documents and seller identity', () => {
    const snap = buildLegalSnapshot(baseInput);
    expect(snap.version).toBe(LEGAL_BUNDLE_VERSION);
    expect(snap.documents).toContain('terms');
    expect(snap.documents).toContain('privacy');
    expect(snap.seller.legalName).toBe('CIOSEK SAMANTA SP. Z O.O.');
    expect(snap.seller.tradeName).toBe('Szef Donald');
    expect(snap.seller.nip).toBe('6572959741');
    expect(snap.currency).toBe('PLN');
    expect(snap.acceptedAt).toBe('2026-06-27T10:00:00.000Z');
  });

  it('omits the registered address when it is the same as trading', () => {
    expect(buildLegalSnapshot(baseInput).seller.registeredAddress).toBeNull();
  });

  it('captures the registered address when it differs from trading', () => {
    const snap = buildLegalSnapshot({
      ...baseInput,
      restaurant: { ...baseRestaurant, registeredAddressSameAsTrading: false },
    });
    expect(snap.seller.registeredAddress).toEqual({
      line1: 'ul. Inny 9',
      city: 'Kielce',
      country: 'PL',
    });
  });

  it('captures delivery/pickup ETA ranges, null when a bound is missing', () => {
    const snap = buildLegalSnapshot(baseInput);
    expect(snap.fulfilment.estimatedDeliveryMinutes).toEqual({ min: 30, max: 60 });
    const partial = buildLegalSnapshot({
      ...baseInput,
      restaurant: { ...baseRestaurant, estimatedPickupMinutesMax: null },
    });
    expect(partial.fulfilment.estimatedPickupMinutes).toBeNull();
  });
});

describe('hashLegalSnapshot', () => {
  it('is deterministic regardless of property insertion order', () => {
    const snap = buildLegalSnapshot(baseInput);
    const reordered = JSON.parse(
      JSON.stringify({
        currency: snap.currency,
        seller: snap.seller,
        version: snap.version,
        documents: snap.documents,
        fulfilment: snap.fulfilment,
        effectiveDate: snap.effectiveDate,
        acceptedAt: snap.acceptedAt,
        locale: snap.locale,
      }),
    );
    expect(hashLegalSnapshot(reordered)).toBe(hashLegalSnapshot(snap));
  });

  it('changes when any captured value changes', () => {
    const a = hashLegalSnapshot(buildLegalSnapshot(baseInput));
    const b = hashLegalSnapshot(
      buildLegalSnapshot({
        ...baseInput,
        restaurant: { ...baseRestaurant, nip: '0000000000' },
      }),
    );
    expect(a).not.toBe(b);
  });

  it('produces a 64-char hex sha256 digest', () => {
    expect(hashLegalSnapshot(buildLegalSnapshot(baseInput))).toMatch(/^[0-9a-f]{64}$/);
  });
});
