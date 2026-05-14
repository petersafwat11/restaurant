import { describe, expect, it } from 'vitest';
import { mergeCartItems } from '../cart-store';

describe('mergeCartItems', () => {
  it('collapses duplicate (menuItemId, fingerprint) entries by summing quantities', () => {
    const out = mergeCartItems({
      userItems: [{ menuItemId: 'm1', quantity: 2, fingerprint: '∅' }],
      guestItems: [{ menuItemId: 'm1', quantity: 3, fingerprint: '∅' }],
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.quantity).toBe(5);
  });

  it('keeps distinct fingerprints separate', () => {
    const out = mergeCartItems({
      userItems: [{ menuItemId: 'm1', quantity: 2, fingerprint: 'g1:o1' }],
      guestItems: [{ menuItemId: 'm1', quantity: 3, fingerprint: 'g1:o2' }],
    });
    expect(out).toHaveLength(2);
    const qs = out.map((it) => it.quantity).sort();
    expect(qs).toEqual([2, 3]);
  });

  it('keeps distinct menuItemIds separate', () => {
    const out = mergeCartItems({
      userItems: [{ menuItemId: 'm1', quantity: 1, fingerprint: '∅' }],
      guestItems: [{ menuItemId: 'm2', quantity: 1, fingerprint: '∅' }],
    });
    expect(out).toHaveLength(2);
  });

  it('returns user items as-is when guest cart is empty', () => {
    const out = mergeCartItems({
      userItems: [{ menuItemId: 'm1', quantity: 2, fingerprint: '∅' }],
      guestItems: [],
    });
    expect(out).toEqual([{ menuItemId: 'm1', quantity: 2, fingerprint: '∅' }]);
  });

  it('returns guest items as-is when user cart is empty', () => {
    const out = mergeCartItems({
      userItems: [],
      guestItems: [{ menuItemId: 'm1', quantity: 4, fingerprint: '∅' }],
    });
    expect(out).toEqual([{ menuItemId: 'm1', quantity: 4, fingerprint: '∅' }]);
  });
});
