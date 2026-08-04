import { describe, expect, it } from 'vitest';
import { reconcileAction } from '../reconcile';

describe('reconcileAction (F6)', () => {
  it('repairs a missed webhook: provider succeeded but local still pending', () => {
    expect(reconcileAction('succeeded', 'PENDING')).toBe('mark_paid');
    expect(reconcileAction('succeeded', 'AUTHORIZED')).toBe('mark_paid');
  });

  it('marks canceled/failed intents as failed', () => {
    expect(reconcileAction('canceled', 'PENDING')).toBe('mark_failed');
    expect(reconcileAction('failed', 'PENDING')).toBe('mark_failed');
  });

  it('leaves genuinely in-progress intents alone', () => {
    expect(reconcileAction('processing', 'PENDING')).toBe('leave');
    expect(reconcileAction('requires_action', 'PENDING')).toBe('leave');
  });

  it('never touches a terminal local row, even if the provider disagrees', () => {
    expect(reconcileAction('failed', 'PAID')).toBe('leave');
    expect(reconcileAction('canceled', 'REFUNDED')).toBe('leave');
    expect(reconcileAction('succeeded', 'PARTIALLY_REFUNDED')).toBe('leave');
  });

  it('flags unknown provider status for a human', () => {
    expect(reconcileAction('unknown', 'PENDING')).toBe('attention');
  });

  it('leaves the row when the provider status is indeterminate (null)', () => {
    expect(reconcileAction(null, 'PENDING')).toBe('leave');
  });

  it('performs a final decision at the 24-hour HPP expiry', () => {
    expect(reconcileAction('succeeded', 'PENDING', true)).toBe('mark_paid');
    expect(reconcileAction('requires_action', 'PENDING', true)).toBe('mark_failed');
    expect(reconcileAction(null, 'PENDING', true)).toBe('mark_failed');
  });
});
