import { OG_CONTENT_TYPE, OG_SIZE, renderBrandOgImage } from '@/lib/seo/og-image';

export const alt = 'About Szef Donald';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const runtime = 'edge';

export default function AboutOgImage() {
  return renderBrandOgImage({
    eyebrow: 'Our story',
    title: 'A kebab shop in Kielce, since 2019.',
    description: 'Kebab and falafel on Ściegiennego. Made to order, nothing from a freezer.',
  });
}
