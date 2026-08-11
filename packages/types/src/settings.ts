import { z } from 'zod';

const MoneyStringSchema = z.string().regex(/^-?\d+(\.\d{1,2})?$/);

export const TaxRateStringSchema = z
  .string()
  .regex(/^-?\d+(\.\d{1,4})?$/)
  .refine(
    (val) => {
      const n = Number(val);
      return !Number.isNaN(n) && n >= 0 && n <= 1;
    },
    { message: 'Tax rate must be between 0 and 1 (0% to 100%)' },
  );

export const HolidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: z.string().min(1).max(120),
  isClosed: z.boolean().default(true),
  openOverride: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  closeOverride: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
});
export type HolidayDto = z.infer<typeof HolidaySchema>;

export const RestaurantSettingsSchema = z.object({
  taxRate: TaxRateStringSchema,
  defaultDeliveryFee: MoneyStringSchema,
  minOrderAmount: MoneyStringSchema,
  deliveryRadiusKm: z.number().positive(),
  holidayDates: z.array(HolidaySchema),
  reservationSlotMinutes: z.number().int().min(15).max(360),
  reservationBufferMinutes: z.number().int().min(0).max(120),
  timezone: z.string(),
  currency: z.string(),
});
export type RestaurantSettingsDto = z.infer<typeof RestaurantSettingsSchema>;

export const UpdateRestaurantSettingsSchema = z
  .object({
    taxRate: TaxRateStringSchema.optional(),
    defaultDeliveryFee: MoneyStringSchema.optional(),
    minOrderAmount: MoneyStringSchema.optional(),
    deliveryRadiusKm: z.number().positive().max(100).optional(),
    reservationSlotMinutes: z.number().int().min(15).max(360).optional(),
    reservationBufferMinutes: z.number().int().min(0).max(120).optional(),
  })
  .partial();
export type UpdateRestaurantSettingsDto = z.infer<typeof UpdateRestaurantSettingsSchema>;
