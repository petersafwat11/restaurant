import { OG_CONTENT_TYPE, OG_SIZE, renderBrandOgImage } from '@/lib/seo/og-image';

export const alt = 'About Szef Donald';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const runtime = 'edge';

export default function AboutOgImage() {
  return renderBrandOgImage({
    eyebrow: 'Our story',
    title: 'Kebab the way it should be.',
    description: 'Open since 2014. Three cooks. One counter. Nothing from a freezer.',
  });
}
