import { OG_CONTENT_TYPE, OG_SIZE, renderBrandOgImage } from '@/lib/seo/og-image';

export const alt = 'Find us — Szef Donald';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const runtime = 'edge';

export default function LocationsOgImage() {
  return renderBrandOgImage({
    eyebrow: 'Visit us',
    title: 'Find your nearest Szef.',
    description: 'Hours, address, and the delivery zone — at a glance.',
  });
}
