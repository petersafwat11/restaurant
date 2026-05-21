import { z } from 'zod';
import { PasswordSchema, PhoneSchema } from './auth';

export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  phone: PhoneSchema.nullish(),
  avatarUrl: z.string().url().nullish(),
  locale: z.enum(['pl', 'en']).optional(),
});
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: PasswordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must differ from current password',
    path: ['newPassword'],
  });
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;

export const UserPublicSchema = z.object({
  id: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
});
export type UserPublicDto = z.infer<typeof UserPublicSchema>;
