import manifest, { ADMIN_PWA_THEME_COLOR } from '@/app/manifest';
import { describe, expect, it } from 'vitest';

describe('admin PWA manifest', () => {
  it('declares a root-scoped standalone app with installable icons', () => {
    const value = manifest();

    expect(value).toMatchObject({
      id: '/',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: ADMIN_PWA_THEME_COLOR,
      theme_color: ADMIN_PWA_THEME_COLOR,
      prefer_related_applications: false,
    });
    expect(value.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: '192x192', type: 'image/png' }),
        expect.objectContaining({ sizes: '512x512', type: 'image/png', purpose: 'any' }),
        expect.objectContaining({ sizes: '512x512', type: 'image/png', purpose: 'maskable' }),
      ]),
    );
  });
});
