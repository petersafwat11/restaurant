/**
 * Pure pseudonymisation transform for account anonymisation (plan §G2).
 *
 * Kept dependency-free and deterministic so it is unit-testable without a DB and
 * so the produced placeholder is reproducible. The anonymisation job applies the
 * returned patch to the `User` row — the row is pseudonymised, never deleted
 * (Review.userId is FK-restrict, and retained orders keep their user link; the
 * Order already carries an immutable customer snapshot for receipts/accounting).
 *
 * IMPORTANT: this only anonymises the User's directly-identifying profile fields.
 * Deleting child rows (addresses, tokens, notification prefs, payment methods,
 * carts) and the retain-vs-detach decision for optional social data
 * (reviews/loyalty/referrals) is the job's responsibility — and the latter needs
 * lawyer/accountant sign-off (the retention matrix, plan §G1).
 */

/** The directly-identifying User fields cleared/replaced on anonymisation. */
export interface PseudonymisedUserFields {
  email: string;
  phone: null;
  firstName: null;
  lastName: null;
  avatarUrl: null;
  passwordHash: null;
  isActive: false;
}

/**
 * Non-reversible placeholder email keyed on the user id. Must stay unique
 * (`User.email @unique`) and use a non-deliverable reserved TLD (RFC 6761
 * `.invalid`) so it can never collide with or reach a real address.
 */
export function anonymisedEmail(userId: string): string {
  return `deleted-${userId}@deleted.invalid`;
}

/**
 * Build the field patch that pseudonymises a user. Email becomes a deterministic
 * non-reversible placeholder; phone (also `@unique`) is nulled so it can be
 * reused; name/avatar/password are cleared and the account is deactivated.
 */
export function pseudonymiseUser(userId: string): PseudonymisedUserFields {
  return {
    email: anonymisedEmail(userId),
    phone: null,
    firstName: null,
    lastName: null,
    avatarUrl: null,
    passwordHash: null,
    isActive: false,
  };
}
