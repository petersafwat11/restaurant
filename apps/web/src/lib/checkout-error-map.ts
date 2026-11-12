import type { z } from 'zod';
import { getZodErrorMap } from './zod-error-map';

type Translator = (key: string, values?: Record<string, string | number | Date>) => string;

/**
 * Locale-aware error map for `CheckoutFormSchema`. The schema deliberately
 * carries no `message` strings, so every issue reaches this map and is
 * translated from `validation.checkout.*` by field path, falling back to the
 * generic `validation.*` map (required / email / too long).
 */
export function getCheckoutErrorMap(t: Translator): z.core.$ZodErrorMap {
  const generic = getZodErrorMap(t);
  return (issue) => {
    const path = (issue.path ?? []).map(String).join('.');
    switch (path) {
      case 'contact.name':
        if (issue.code === 'too_big') break;
        return t('checkout.nameRequired');
      case 'contact.phone':
        return t('invalidPhone');
      case 'contact.email':
        if (issue.code === 'too_big') break;
        return t('invalidEmail');
      case 'acceptedTerms':
        return t('checkout.acceptTerms');
      case 'address.line1':
        if (issue.code === 'too_big') break;
        return t('checkout.addressRequired');
      case 'address.city':
        if (issue.code === 'too_big') break;
        return t('checkout.cityRequired');
      case 'address.geoPoint':
        return t('checkout.pinRequired');
      case 'tableNumber':
        if (issue.code === 'too_big') break;
        return t('checkout.tableRequired');
      case 'tipAmount':
        return t('checkout.invalidTip');
    }
    return generic(issue);
  };
}
