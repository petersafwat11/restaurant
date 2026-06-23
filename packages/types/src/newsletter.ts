import { z } from 'zod';

/** Marketing-newsletter subscription (GDPR double opt-in). */
export const NewsletterSubscribeSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  // Explicit, unticked-by-default marketing consent — must be `true`.
  consent: z.literal(true, {
    errorMap: () => ({ message: 'You must accept to receive the newsletter.' }),
  }),
  locale: z.string().min(2).max(5).optional(),
  source: z.string().max(40).optional(),
});
export type NewsletterSubscribeDto = z.infer<typeof NewsletterSubscribeSchema>;

/** Confirm / unsubscribe via the single-use token from the email link. */
export const NewsletterTokenSchema = z.object({
  token: z.string().min(10),
});
export type NewsletterTokenDto = z.infer<typeof NewsletterTokenSchema>;

export const NEWSLETTER_STATUSES = ['PENDING', 'CONFIRMED', 'UNSUBSCRIBED'] as const;
export type NewsletterStatus = (typeof NEWSLETTER_STATUSES)[number];

/** Minimal response — never leaks the token. */
export const NewsletterResultSchema = z.object({
  status: z.enum(NEWSLETTER_STATUSES),
});
export type NewsletterResultDto = z.infer<typeof NewsletterResultSchema>;
