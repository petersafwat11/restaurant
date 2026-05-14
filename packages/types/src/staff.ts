import { z } from 'zod';

export const STAFF_ROLE_KEYS = ['owner', 'manager', 'kitchen', 'cashier'] as const;
export type StaffRoleKey = (typeof STAFF_ROLE_KEYS)[number];

export const StaffMemberSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  phone: z.string().nullable(),
  roleKeys: z.array(z.string()),
  isActive: z.boolean(),
  emailVerifiedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type StaffMemberDto = z.infer<typeof StaffMemberSchema>;

export const StaffListSchema = z.array(StaffMemberSchema);

export const InviteStaffSchema = z.object({
  email: z.string().email(),
  roleKey: z.enum(STAFF_ROLE_KEYS),
  restaurantId: z.string().optional(),
});
export type InviteStaffDto = z.infer<typeof InviteStaffSchema>;

export const StaffInviteSchema = z.object({
  id: z.string(),
  email: z.string(),
  roleKey: z.string(),
  expiresAt: z.string(),
  acceptedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type StaffInviteDto = z.infer<typeof StaffInviteSchema>;

export const AcceptStaffInviteSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(120),
  firstName: z.string().min(1).max(120),
  lastName: z.string().min(1).max(120),
});
export type AcceptStaffInviteDto = z.infer<typeof AcceptStaffInviteSchema>;

export const UpdateStaffRoleSchema = z.object({
  roleKey: z.enum(STAFF_ROLE_KEYS),
});
export type UpdateStaffRoleDto = z.infer<typeof UpdateStaffRoleSchema>;

export const StaffListQuerySchema = z.object({
  roleKey: z.enum(STAFF_ROLE_KEYS).optional(),
  restaurantId: z.string().optional(),
});
export type StaffListQuery = z.infer<typeof StaffListQuerySchema>;
