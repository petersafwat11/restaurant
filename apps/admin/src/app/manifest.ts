import type { MetadataRoute } from 'next';

export const ADMIN_PWA_THEME_COLOR = '#0B0D12';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Szef Donald Admin',
    short_name: 'Donald Admin',
    description: 'Restaurant operations, orders, kitchen, and staff administration.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: ADMIN_PWA_THEME_COLOR,
    theme_color: ADMIN_PWA_THEME_COLOR,
    prefer_related_applications: false,
    icons: [
      {
        src: '/icons/admin-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/admin-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/admin-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
