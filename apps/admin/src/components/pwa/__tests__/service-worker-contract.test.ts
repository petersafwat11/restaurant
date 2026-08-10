import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');

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
    expect(source).toContain('key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME');
  });

  it('handles closed-app Web Push and opens only same-origin order links', () => {
    expect(source).toContain("self.addEventListener('push'");
    expect(source).toContain("self.addEventListener('notificationclick'");
    expect(source).toContain(
      "self.clients.matchAll({ type: 'window', includeUncontrolled: true })",
    );
    expect(source).toContain('openWindows.length > 0');
    expect(source).toContain('requestedUrl.origin === self.location.origin');
    expect(source).toContain('self.clients.openWindow(targetUrl)');
  });
});
