import { z } from 'zod';
import { PERMISSION_KEYS } from './permissions';

export const EmailSchema = z.string().email().max(255).toLowerCase().trim();
export const PhoneSchema = z
  .string()
  .min(7)
  .max(20)
  .regex(/^\+?[0-9\s().-]+$/, 'Invalid phone number');

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a digit');

export const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  phone: PhoneSchema.optional(),
  referralCode: z
    .string()
    .min(6)
    .max(16)
    .regex(/^[A-Za-z0-9]+$/)
    .optional(),
});
export type RegisterDto = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1).max(128),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshDto = z.infer<typeof RefreshSchema>;

export const RequestOtpSchema = z.object({
  phone: PhoneSchema,
});
export type RequestOtpDto = z.infer<typeof RequestOtpSchema>;

export const VerifyOtpSchema = z.object({
  phone: PhoneSchema,
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, 'OTP must be 6 digits'),
});
export type VerifyOtpDto = z.infer<typeof VerifyOtpSchema>;

export const ForgotPasswordSchema = z.object({
  email: EmailSchema,
});
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: PasswordSchema,
});
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;

export const VerifyEmailSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailDto = z.infer<typeof VerifyEmailSchema>;

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
});
export type AuthTokensDto = z.infer<typeof AuthTokensSchema>;

export const AUTH_AUDIENCES = ['web', 'admin', 'mobile'] as const;
export type AuthAudience = (typeof AUTH_AUDIENCES)[number];
export const AUTH_AUDIENCE_HEADER = 'x-app-audience';

export const MeSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  locale: z.string(),
  emailVerifiedAt: z.string().nullable(),
  phoneVerifiedAt: z.string().nullable(),
  roles: z.array(z.string()),
  permissions: z.array(z.enum(PERMISSION_KEYS)),
});
export type MeDto = z.infer<typeof MeSchema>;

export const AuthResponseSchema = z.object({
  // Tokens are only present for header-based clients (mobile). For cookie-based
  // clients (web/admin), the API sets httpOnly cookies and omits these fields.
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresIn: z.number().int().positive().optional(),
  user: MeSchema,
});
export type AuthResponseDto = z.infer<typeof AuthResponseSchema>;
