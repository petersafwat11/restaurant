import { OG_CONTENT_TYPE, OG_SIZE, renderBrandOgImage } from '@/lib/seo/og-image';

export const alt = 'Szef Donald — Real kebab, made daily.';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const runtime = 'edge';

export default function OpengraphImage() {
  return renderBrandOgImage({
    eyebrow: 'Made daily',
    title: 'Real kebab.',
    description: 'Bread baked through the day. Falafel rolled by hand. Meat marinated 18 hours.',
  });
}
