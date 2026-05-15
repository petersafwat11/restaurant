import { describe, expect, it } from 'vitest';
import { captureException, flushSentry, initNodeSentry, isSentryEnabled } from './sentry';

describe('observability (no-op safe)', () => {
  it('does not enable when DSN is empty', () => {
    expect(initNodeSentry({ dsn: '' })).toBe(false);
    expect(isSentryEnabled()).toBe(false);
  });

  it('capture/flush are safe no-ops when disabled', async () => {
    expect(() => captureException(new Error('x'), { password: 'secret' })).not.toThrow();
    await expect(flushSentry(10)).resolves.toBeUndefined();
  });

  it('enables with a DSN', () => {
    const ok = initNodeSentry({
      dsn: 'https://abc@o0.ingest.sentry.io/0',
      environment: 'test',
    });
    expect(ok).toBe(true);
    expect(isSentryEnabled()).toBe(true);
  });
});
