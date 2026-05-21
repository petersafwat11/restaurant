import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import { z, type ZodIssue, type ZodSchema } from 'zod';

type TranslateFn = (key: string, args?: Record<string, unknown>) => string;

function translateIssue(issue: ZodIssue, t: TranslateFn | null): string {
  if (!t) return issue.message;
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type: {
      if (issue.received === 'undefined' || issue.received === 'null') {
        return t('validation.required');
      }
      break;
    }
    case z.ZodIssueCode.invalid_string: {
      if (issue.validation === 'email') return t('validation.invalidEmail');
      break;
    }
    case z.ZodIssueCode.too_small: {
      if (issue.type === 'string') {
        const min = (issue as { minimum?: number }).minimum;
        if (typeof min === 'number' && min > 1) {
          return t('validation.passwordTooShort', { min });
        }
        return t('validation.required');
      }
      break;
    }
    case z.ZodIssueCode.too_big: {
      if (issue.type === 'string') {
        const max = (issue as { maximum?: number }).maximum;
        if (typeof max === 'number') return t('validation.tooLong', { max });
      }
      break;
    }
  }
  return issue.message;
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      const ctx = I18nContext.current();
      const t: TranslateFn | null = ctx
        ? (key, args) => ctx.t(key, args ? { args } : undefined) as string
        : null;

      throw new BadRequestException({
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: translateIssue(i, t),
          code: i.code,
        })),
      });
    }
    return parsed.data;
  }
}
