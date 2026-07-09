import { describe, expect, it } from 'vitest';
import { classifyWebhookType, mapTransactionStatus } from '../eservice-status';

describe('mapTransactionStatus (F6 reconciliation)', () => {
  it('maps CAPTURED to succeeded', () => {
    expect(mapTransactionStatus('CAPTURED')).toBe('succeeded');
    // Case-insensitive.
    expect(mapTransactionStatus('captured')).toBe('succeeded');
  });

  it('maps dead states (DECLINED/EXPIRED/REVERSED) to failed', () => {
    expect(mapTransactionStatus('DECLINED')).toBe('failed');
    expect(mapTransactionStatus('EXPIRED')).toBe('failed');
    expect(mapTransactionStatus('REVERSED')).toBe('failed');
  });

  it('maps in-flight states to requires_action (leave the row)', () => {
    expect(mapTransactionStatus('INITIATED')).toBe('requires_action');
    expect(mapTransactionStatus('PENDING')).toBe('requires_action');
    expect(mapTransactionStatus('PREAUTHORIZED')).toBe('requires_action');
  });

  it('returns null for unknown / missing status (indeterminate)', () => {
    expect(mapTransactionStatus(undefined)).toBeNull();
    expect(mapTransactionStatus(null)).toBeNull();
    expect(mapTransactionStatus('')).toBeNull();
    expect(mapTransactionStatus('SOMETHING_ELSE')).toBeNull();
  });
});

describe('classifyWebhookType (status-notification → event type)', () => {
  it('CAPTURED + result 00 → payment.succeeded (card + BLIK)', () => {
    expect(classifyWebhookType('CAPTURED', '00')).toBe('payment.succeeded');
  });

  it('CAPTURED without an authorised result is NOT treated as success', () => {
    // A capture whose result code isn't '00' falls through to the informational
    // bucket rather than being misread as a success.
    expect(classifyWebhookType('CAPTURED', '05')).toBe('payment.status');
    expect(classifyWebhookType('CAPTURED', undefined)).toBe('payment.status');
  });

  it('DECLINED/EXPIRED/REVERSED → payment.failed', () => {
    expect(classifyWebhookType('DECLINED', '05')).toBe('payment.failed');
    expect(classifyWebhookType('EXPIRED', undefined)).toBe('payment.failed');
    expect(classifyWebhookType('REVERSED', undefined)).toBe('payment.failed');
  });

  it('in-flight/other statuses → payment.status (ignored by the dispatcher)', () => {
    expect(classifyWebhookType('INITIATED', undefined)).toBe('payment.status');
    expect(classifyWebhookType('PENDING', undefined)).toBe('payment.status');
  });
});
