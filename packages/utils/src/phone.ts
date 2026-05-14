/**
 * Minimal phone helpers — full E.164 parsing arrives when we wire up libphonenumber
 * in a later sprint. For now, accept any string with a leading + or 7-15 digits.
 */
const PHONE_RE = /^\+?[0-9]{7,15}$/;

export function isValidPhone(input: string): boolean {
  const stripped = input.replace(/[\s().-]/g, '');
  return PHONE_RE.test(stripped);
}

export function formatPhone(input: string): string {
  return input.replace(/[\s().-]/g, '');
}
