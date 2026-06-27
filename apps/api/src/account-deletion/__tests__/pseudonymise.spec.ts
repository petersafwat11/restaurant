import { describe, expect, it } from 'vitest';
import { anonymisedEmail, pseudonymiseUser } from '../pseudonymise';

describe('anonymisedEmail', () => {
  it('is deterministic for a given user id', () => {
    expect(anonymisedEmail('user_123')).toBe('deleted-user_123@deleted.invalid');
    expect(anonymisedEmail('user_123')).toBe(anonymisedEmail('user_123'));
  });

  it('is unique per user id (so the @unique email constraint holds)', () => {
    expect(anonymisedEmail('a')).not.toBe(anonymisedEmail('b'));
  });

  it('uses a non-deliverable reserved TLD', () => {
    expect(anonymisedEmail('x')).toMatch(/@deleted\.invalid$/);
  });
});

describe('pseudonymiseUser', () => {
  it('replaces the email with the deterministic placeholder', () => {
    expect(pseudonymiseUser('abc').email).toBe('deleted-abc@deleted.invalid');
  });

  it('clears all directly-identifying profile fields', () => {
    const out = pseudonymiseUser('abc');
    expect(out.phone).toBeNull();
    expect(out.firstName).toBeNull();
    expect(out.lastName).toBeNull();
    expect(out.avatarUrl).toBeNull();
  });

  it('strips the password hash and deactivates the account', () => {
    const out = pseudonymiseUser('abc');
    expect(out.passwordHash).toBeNull();
    expect(out.isActive).toBe(false);
  });

  it('does not carry over any identifying input beyond the id-derived email', () => {
    // The transform takes only the id — there is no way to leak the original
    // email/name/phone through it.
    const out = pseudonymiseUser('abc');
    const values = Object.values(out).filter((v): v is string => typeof v === 'string');
    expect(values).toEqual(['deleted-abc@deleted.invalid']);
  });
});
