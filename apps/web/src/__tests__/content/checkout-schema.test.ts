import { CheckoutFormSchema } from '@repo/types';
import { describe, expect, it } from 'vitest';

const baseCheckout = {
  contact: {
    name: 'eService Certification',
    phone: '512345678',
    email: 'eservice.cert@example.com',
  },
  saveInfo: false,
  tableNumber: '',
  timeSlot: { kind: 'asap' as const },
  orderNotes: '',
  paymentMethod: 'card' as const,
  tipAmount: '0.00',
  acceptedTerms: true,
};

describe('CheckoutFormSchema order-type address handling', () => {
  it.each(['PICKUP', 'DINE_IN'] as const)(
    'accepts %s when the hidden delivery form left a blank address placeholder',
    (orderType) => {
      const result = CheckoutFormSchema.safeParse({
        ...baseCheckout,
        orderType,
        tableNumber: orderType === 'DINE_IN' ? '12' : '',
        address: { line1: '', city: '', country: 'PL' },
      });

      expect(result.success).toBe(true);
      if (result.success) expect(result.data.address).toBeUndefined();
    },
  );

  it('still rejects an incomplete delivery address', () => {
    const result = CheckoutFormSchema.safeParse({
      ...baseCheckout,
      orderType: 'DELIVERY',
      address: { line1: '', city: '', country: 'PL' },
    });

    expect(result.success).toBe(false);
  });
});
