import { z } from 'zod';

type Translator = (key: string, values?: Record<string, string | number | Date>) => string;

/**
 * Maps Zod issues to translated messages from `validation.*` keys. The same
 * keys are consulted by the API's ZodValidationPipe (via nestjs-i18n), so a
 * single source of truth in `packages/i18n/messages/{locale}/validation.json`
 * powers both client and server error messages.
 *
 * Schemas that pass `.refine(…, { message })` or `z.string().min(n, msg)`
 * still win — their explicit message overrides this map.
 */
export function getZodErrorMap(t: Translator): z.ZodErrorMap {
  return (issue, ctx) => {
    switch (issue.code) {
      case z.ZodIssueCode.invalid_type: {
        if (issue.received === 'undefined' || issue.received === 'null') {
          return { message: t('required') };
        }
        break;
      }
      case z.ZodIssueCode.invalid_string: {
        if (issue.validation === 'email') return { message: t('invalidEmail') };
        break;
      }
      case z.ZodIssueCode.too_small: {
        if (issue.type === 'string') {
          const min = (issue as { minimum?: number }).minimum;
          if (typeof min === 'number' && min > 1) {
            return { message: t('passwordTooShort', { min }) };
          }
          return { message: t('required') };
        }
        break;
      }
      case z.ZodIssueCode.too_big: {
        if (issue.type === 'string') {
          const max = (issue as { maximum?: number }).maximum;
          if (typeof max === 'number') {
            return { message: t('tooLong', { max }) };
          }
        }
        break;
      }
    }
    return { message: ctx.defaultError };
  };
}
