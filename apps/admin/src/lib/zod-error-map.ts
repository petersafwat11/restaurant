import type { z } from 'zod';

type Translator = (key: string, values?: Record<string, string | number | Date>) => string;

/**
 * Maps Zod issues to translated messages from `validation.*` keys. Mirrors
 * `apps/web/src/lib/zod-error-map.ts` and the API's ZodValidationPipe — all
 * three consult `packages/i18n/messages/{locale}/validation.json`.
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
