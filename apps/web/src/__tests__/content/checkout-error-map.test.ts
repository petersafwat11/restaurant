import { getCheckoutErrorMap } from '@/lib/checkout-error-map';
import { loadMessages } from '@repo/i18n';
import { CheckoutFormSchema } from '@repo/types';
import { describe, expect, it } from 'vitest';

function translator(locale: 'pl' | 'en') {
  const validation = loadMessages(locale).validation as Record<string, unknown>;
  return (key: string, values?: Record<string, string | number | Date>) => {
    let node: unknown = validation;
    for (const part of key.split('.')) node = (node as Record<string, unknown>)?.[part];
    if (typeof node !== 'string') throw new Error(`missing validation.${key}`);
    return node.replace(/\{(\w+)\}/g, (_, k) => String(values?.[k] ?? ''));
  };
}

const invalid = {
  orderType: 'PICKUP',
  contact: { name: '', phone: 'abc', email: 'nope' },
  saveInfo: false,
  timeSlot: { kind: 'asap' },
  paymentMethod: 'cod',
  tipAmount: '0',
  acceptedTerms: false,
};

function messagesFor(locale: 'pl' | 'en') {
  const res = CheckoutFormSchema.safeParse(invalid, {
    error: getCheckoutErrorMap(translator(locale)),
  });
  expect(res.success).toBe(false);
  return Object.fromEntries((res.error?.issues ?? []).map((i) => [i.path.join('.'), i.message]));
}

describe('checkout validation messages', () => {
  it('are Polish on the Polish checkout', () => {
    const m = messagesFor('pl');
    expect(m['contact.name']).toBe('Podaj imię i nazwisko.');
    expect(m['contact.phone']).toBe('Podaj poprawny numer telefonu');
    expect(m['contact.email']).toBe('Podaj poprawny adres e-mail');
    expect(m.acceptedTerms).toMatch(/Regulamin/);
  });

  it('stay English on the English checkout', () => {
    const m = messagesFor('en');
    expect(m['contact.name']).toBe('Please enter your name.');
    expect(m.acceptedTerms).toBe('Please accept the Terms and Privacy Policy to continue.');
  });
});
