import type { z } from 'zod';

type Translator = (key: string, values?: Record<string, string | number | Date>) => string;

/**
 * Maps Zod issues to translated messages from `validation.*` keys. The same
 * keys are consulted by the API's ZodValidationPipe (via nestjs-i18n), so a
 * single source of truth in `packages/i18n/messages/{locale}/validation.json`
 * powers both client and server error messages.
 *
 * Schemas that pass `.refine(…, { message })` or `z.string().min(n, msg)`
 * still win — their explicit message overrides this map.
 *
 * Zod 4 error-map contract: return a message string to override, or
 * `undefined` to fall through to Zod's default. Issue shapes changed from v3:
 * `invalid_string` -> `invalid_format` (`format`), `too_small`/`too_big` use
 * `origin` instead of `type`, and `invalid_type` exposes the raw `input`
 * (error maps always receive it) instead of `received`.
 */
export function getZodErrorMap(t: Translator): z.core.$ZodErrorMap {
  return (issue) => {
    switch (issue.code) {
      case 'invalid_type': {
        if (issue.input === undefined || issue.input === null) {
          return t('required');
        }
        break;
      }
      case 'invalid_format': {
        if (issue.format === 'email') return t('invalidEmail');
        break;
      }
      case 'too_small': {
        if (issue.origin === 'string') {
          const min = issue.minimum;
          if (typeof min === 'number' && min > 1) {
            return t('passwordTooShort', { min });
          }
          return t('required');
        }
        break;
      }
      case 'too_big': {
        if (issue.origin === 'string') {
          const max = issue.maximum;
          if (typeof max === 'number') {
            return t('tooLong', { max });
          }
        }
        break;
      }
    }
    return undefined;
  };
}
