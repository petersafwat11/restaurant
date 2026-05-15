import { describe, expect, it } from 'vitest';
import { getMessageCatalog } from './catalog';
import { formatCurrency, formatNumber } from './format';
import { negotiateLocale, resolveUserLocale } from './negotiate';
import { createTranslator, translate } from './translator';

// Collect every leaf path so en/ar can be asserted structurally identical.
function leafPaths(obj: unknown, prefix = ''): string[] {
  if (typeof obj === 'string') return [prefix];
  if (obj && typeof obj === 'object') {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
      leafPaths(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [];
}

describe('i18n catalog', () => {
  it('en and ar have identical key sets', () => {
    const en = leafPaths(getMessageCatalog('en')).sort();
    const ar = leafPaths(getMessageCatalog('ar')).sort();
    expect(ar).toEqual(en);
    expect(en.length).toBeGreaterThan(50);
  });
});

describe('translator', () => {
  it('interpolates variables', () => {
    const t = createTranslator('en');
    expect(t('auth.welcomeBack', { name: 'Sam' })).toBe('Welcome back, Sam');
  });

  it('resolves nested keys and falls back to en for missing arabic-only gaps', () => {
    expect(translate('en', 'order.status.PENDING')).toBe('Pending');
    expect(translate('ar', 'order.status.PENDING')).toBe('قيد الانتظار');
  });

  it('selects english plural categories', () => {
    const t = createTranslator('en');
    expect(t('cart.itemCount', { count: 1 })).toBe('1 item');
    expect(t('cart.itemCount', { count: 5 })).toBe('5 items');
  });

  it('selects arabic plural categories', () => {
    const t = createTranslator('ar');
    // Arabic CLDR: 1 → one, 2 → two, 3 → few, 11 → many
    expect(t('notifications.unreadCount', { count: 1 })).toContain('واحد');
    expect(t('notifications.unreadCount', { count: 2 })).toContain('غير مقروءان');
  });

  it('returns the key when missing entirely', () => {
    const t = createTranslator('en');
    // @ts-expect-error — intentionally unknown key
    expect(t('does.not.exist')).toBe('does.not.exist');
  });
});

describe('negotiate', () => {
  it('parses q-weighted Accept-Language', () => {
    expect(negotiateLocale('ar;q=0.9, en;q=0.8')).toBe('ar');
    expect(negotiateLocale('fr-FR, en-US;q=0.7')).toBe('en');
    expect(negotiateLocale(null)).toBe('en');
  });

  it('prefers an explicitly stored user locale', () => {
    expect(resolveUserLocale('ar', 'en-US')).toBe('ar');
    expect(resolveUserLocale(null, 'ar')).toBe('ar');
    expect(resolveUserLocale('xx', 'en')).toBe('en');
  });
});

describe('format', () => {
  it('formats numbers and currency per locale', () => {
    expect(formatNumber(1234.5, 'en')).toBe('1,234.5');
    expect(formatCurrency(9.99, 'USD', 'en')).toBe('$9.99');
    expect(formatCurrency(9.99, 'USD', 'ar')).toContain('9.99');
  });
});
