import { OG_CONTENT_TYPE, OG_SIZE, renderBrandOgImage } from '@/lib/seo/og-image';

export const alt = 'Reservations — Szef Donald';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const runtime = 'edge';

export default function ReservationsOgImage() {
  return renderBrandOgImage({
    eyebrow: 'Reservations',
    title: 'Save a table.',
    description: 'Pick a time, walk in, sit down. The grill will be ready.',
  });
}
