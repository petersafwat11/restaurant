import { OG_CONTENT_TYPE, OG_SIZE, renderBrandOgImage } from '@/lib/seo/og-image';

export const alt = 'Browse the menu — Szef Donald';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const runtime = 'edge';

export default function MenuOgImage() {
  return renderBrandOgImage({
    eyebrow: 'Menu',
    title: 'Pick your wrap.',
    description: 'Kebab and falafel. Every item made fresh, no freezer shortcuts.',
  });
}
