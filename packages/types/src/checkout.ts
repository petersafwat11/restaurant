import { z } from 'zod';
import { ORDER_TYPES } from './order';

/**
 * Customer-side checkout form schema. The `useCheckoutForm` hook in the web
 * app uses this with `react-hook-form` + `@hookform/resolvers/zod`.
 *
 * NOTE: the server's `CreateOrderSchema` requires a `deliveryAddressId`
 * (saved address). For now, the checkout form captures the address inline
 * and the page resolves it server-side (creates an address for authed users,
 * errors for guests on DELIVERY). A follow-up backend change will accept an
 * inline `deliveryAddress` field on `CreateOrderDto` to unblock guest
 * delivery checkout.
 */

const PHONE_RE = /^[+\d\s()-]{7,}$/;

export const CheckoutAddressSchema = z.object({
  line1: z.string().min(1, 'Enter your street address.').max(200),
  apartment: z.string().max(80).optional(),
  city: z.string().min(1, 'Enter your city.').max(100),
  country: z.string().length(2).default('PL'),
  notes: z.string().max(300).optional(),
  // Required: pin must be dropped on the map picker, so we always have a
  // geo-point to validate against the delivery zones.
  geoPoint: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
});
export type CheckoutAddressInput = z.infer<typeof CheckoutAddressSchema>;

export const TimeSlotSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('asap') }),
  z.object({ kind: z.literal('scheduled'), iso: z.string().datetime() }),
]);
export type TimeSlotInput = z.infer<typeof TimeSlotSchema>;

export const CHECKOUT_PAYMENT_METHODS = ['card', 'blik', 'applepay', 'googlepay', 'cod'] as const;
export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number];

export const CheckoutFormSchema = z
  .object({
    orderType: z.enum(ORDER_TYPES),
    contact: z.object({
      name: z.string().min(1, 'Please enter your name.').max(80),
      phone: z.string().regex(PHONE_RE, 'Enter a valid phone number.'),
      email: z.string().email('Enter a valid email address.'),
    }),
    saveInfo: z.boolean().default(false),
    address: CheckoutAddressSchema.optional(),
    tableNumber: z.string().max(20).optional(),
    timeSlot: TimeSlotSchema.default({ kind: 'asap' }),
    orderNotes: z.string().max(500).optional(),
    paymentMethod: z.enum(CHECKOUT_PAYMENT_METHODS),
    tipAmount: z
      .string()
      .regex(/^-?\d+(\.\d{1,2})?$/, 'Invalid tip amount.')
      .default('0'),
    promoCode: z.string().max(60).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.orderType === 'DELIVERY') {
      if (!data.address?.line1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['address', 'line1'],
          message: 'Add your delivery address.',
        });
      }
      if (!data.address?.geoPoint) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['address', 'geoPoint'],
          message: 'Drop a pin on the map to confirm your location.',
        });
      }
    }
    if (data.orderType === 'DINE_IN' && !data.tableNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tableNumber'],
        message: 'Table number required.',
      });
    }
  });
export type CheckoutFormInput = z.infer<typeof CheckoutFormSchema>;
