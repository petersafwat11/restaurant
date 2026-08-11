import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');
const dockerfile = readFileSync(resolve(process.cwd(), 'Dockerfile'), 'utf8');

describe('admin service-worker cache contract', () => {
  it('keeps mutations and authenticated navigations out of persistent caches', () => {
    expect(source).toContain("if (request.method !== 'GET') return");
    expect(source).toContain("if (request.mode === 'navigate')");
    expect(source).toContain('fetch(request).catch');
    expect(source).not.toMatch(/cache\.put\([^\n]*(api|socket|auth|order)/i);
  });

  it('provides localized offline fallbacks and versioned cache cleanup', () => {
    expect(source).toContain("const OFFLINE_URLS = ['/offline', '/en/offline']");
    expect(source).toContain("const CACHE_PREFIX = 'szef-donald-admin-pwa-'");
    expect(source).toContain('const CACHE_NAME = `${CACHE_PREFIX}v2`');
    expect(source).toContain('key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME');
    expect(source).toContain('.then(() => self.skipWaiting())');
  });

  it('displays every received Web Push and opens only same-origin order links', () => {
    expect(source).toContain("self.addEventListener('push'");
    expect(source).toContain('self.registration.showNotification');
    expect(source).toContain("self.addEventListener('notificationclick'");
    expect(source).not.toContain('openWindows.length > 0');
    expect(source).toContain('requestedUrl.origin === self.location.origin');
    expect(source).toContain('self.clients.openWindow(targetUrl)');
  });

  it.each([
    ['foreground', [{ visibilityState: 'visible' }]],
    ['background', [{ visibilityState: 'hidden' }]],
    ['closed', []],
  ])('shows the system notification while the app is %s', async (_state, windows) => {
    const handlers = new Map<
      string,
      (event: { waitUntil: (promise: Promise<unknown>) => void }) => void
    >();
    const showNotification = vi.fn().mockResolvedValue(undefined);
    const matchAll = vi.fn().mockResolvedValue(windows);
    runInNewContext(source, {
      self: {
        addEventListener: (name: string, handler: (event: never) => void) =>
          handlers.set(name, handler as never),
        clients: { claim: vi.fn(), matchAll, openWindow: vi.fn() },
        location: { origin: 'https://admin.example.test' },
        registration: { showNotification },
        skipWaiting: vi.fn(),
      },
      caches: { keys: vi.fn(), open: vi.fn() },
      Request,
      URL,
    });

    let pending: Promise<unknown> | undefined;
    handlers.get('push')?.({
      data: {
        json: () => ({ title: 'New order', tag: 'order-1', url: '/orders/order-1' }),
      },
      waitUntil: (promise: Promise<unknown>) => {
        pending = promise;
      },
    } as never);
    await pending;

    expect(showNotification).toHaveBeenCalledOnce();
    expect(matchAll).not.toHaveBeenCalled();
  });

  it('ships the public PWA assets in the standalone production image', () => {
    expect(dockerfile).toContain(
      'COPY --from=builder --chown=app:app /app/apps/admin/public ./apps/admin/public',
    );
  });
});
