import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import type { z } from 'zod';

type TranslateFn = (key: string, args?: Record<string, unknown>) => string;

// Zod 4 issue shapes: `invalid_string` became `invalid_format` (with `format`),
// `too_small`/`too_big` carry `origin` instead of `type`, and `invalid_type`
// no longer has `received` — the raw `input` is only attached when parsing with
// `reportInput: true` (see transform below; it is never sent to the client).
function translateIssue(issue: z.core.$ZodIssue, t: TranslateFn | null): string {
  if (!t) return issue.message;
  switch (issue.code) {
    case 'invalid_type': {
      if (issue.input === undefined || issue.input === null) {
        return t('validation.required');
      }
      break;
    }
    case 'invalid_format': {
      if (issue.format === 'email') return t('validation.invalidEmail');
      break;
    }
    case 'too_small': {
      if (issue.origin === 'string') {
        const min = issue.minimum;
        if (typeof min === 'number' && min > 1) {
          return t('validation.passwordTooShort', { min });
        }
        return t('validation.required');
      }
      break;
    }
    case 'too_big': {
      if (issue.origin === 'string') {
        const max = issue.maximum;
        if (typeof max === 'number') return t('validation.tooLong', { max });
      }
      break;
    }
  }
  return issue.message;
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: z.ZodType) {}

  transform(value: unknown): unknown {
    // `reportInput` lets translateIssue tell "missing" from "wrong type"; the
    // input itself stays server-side (only path/message/code are returned).
    const parsed = this.schema.safeParse(value, { reportInput: true });
    if (!parsed.success) {
      const ctx = I18nContext.current();
      const t: TranslateFn | null = ctx
        ? (key, args) => ctx.t(key, args ? { args } : undefined) as string
        : null;

      throw new BadRequestException({
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: parsed.error.issues.map((i) => ({
          path: i.path.map(String).join('.'),
          message: translateIssue(i, t),
          code: i.code,
        })),
      });
    }
    return parsed.data;
  }
}
