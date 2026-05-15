import { z } from 'zod';

export const RESERVATION_STATUSES = [
  'confirmed',
  'seated',
  'completed',
  'cancelled',
  'no_show',
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const TableSchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
  name: z.string(),
  capacity: z.number().int().min(1),
});
export type TableDto = z.infer<typeof TableSchema>;

export const CreateTableSchema = z.object({
  name: z.string().min(1).max(50),
  capacity: z.number().int().min(1).max(50),
});
export type CreateTableDto = z.infer<typeof CreateTableSchema>;

export const UpdateTableSchema = CreateTableSchema.partial();
export type UpdateTableDto = z.infer<typeof UpdateTableSchema>;

export const TableListSchema = z.array(TableSchema);

export const ReservationSchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  restaurantId: z.string(),
  tableId: z.string().nullable(),
  guestCount: z.number().int().min(1),
  startAt: z.string(),
  endAt: z.string(),
  status: z.enum(RESERVATION_STATUSES),
  contactName: z.string(),
  contactPhone: z.string(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ReservationDto = z.infer<typeof ReservationSchema>;

export const ReservationListSchema = z.object({
  items: z.array(ReservationSchema),
  nextCursor: z.string().nullable(),
});
export type ReservationListDto = z.infer<typeof ReservationListSchema>;

export const CreateReservationSchema = z.object({
  restaurantId: z.string().min(1),
  startAt: z.string().datetime(),
  partySize: z.number().int().min(1).max(50),
  contactName: z.string().min(1).max(120),
  contactPhone: z.string().min(3).max(30),
  contactEmail: z.string().email().optional(),
  occasion: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
});
export type CreateReservationDto = z.infer<typeof CreateReservationSchema>;

export const UpdateReservationSchema = z
  .object({
    startAt: z.string().datetime().optional(),
    partySize: z.number().int().min(1).max(50).optional(),
    notes: z.string().max(500).nullable().optional(),
    tableId: z.string().nullable().optional(),
  })
  .partial();
export type UpdateReservationDto = z.infer<typeof UpdateReservationSchema>;

export const CancelReservationSchema = z.object({
  reason: z.string().min(1).max(300),
});
export type CancelReservationDto = z.infer<typeof CancelReservationSchema>;

export const SeatReservationSchema = z.object({
  tableId: z.string().min(1),
});
export type SeatReservationDto = z.infer<typeof SeatReservationSchema>;

export const AvailabilityQuerySchema = z.object({
  restaurantId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  partySize: z.coerce.number().int().min(1).max(50),
});
export type AvailabilityQueryDto = z.infer<typeof AvailabilityQuerySchema>;

export const AvailabilitySlotSchema = z.object({
  startAt: z.string(), // ISO
  endAt: z.string(),
  capacity: z.number().int().min(0),
});
export type AvailabilitySlotDto = z.infer<typeof AvailabilitySlotSchema>;

export const AvailabilityResponseSchema = z.object({
  slots: z.array(AvailabilitySlotSchema),
});
export type AvailabilityResponseDto = z.infer<typeof AvailabilityResponseSchema>;

export const ReservationListQuerySchema = z.object({
  restaurantId: z.string().optional(),
  status: z.enum(RESERVATION_STATUSES).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type ReservationListQuery = z.infer<typeof ReservationListQuerySchema>;
