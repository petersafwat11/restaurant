/**
 * Shared OG image renderer for `opengraph-image.tsx` route handlers.
 *
 * Uses Next.js's `ImageResponse` (Edge runtime, Satori-based SVG → PNG)
 * to render a brand-consistent 1200×630 social card. Each page-level
 * `opengraph-image.tsx` is a thin wrapper that picks the brand/title/eyebrow
 * and calls this helper, so the visual identity stays in one file.
 *
 * Fonts: we ship system fonts to keep the Edge bundle tight. The Tailwind
 * theme tokens are inlined as hex literals here — the OG renderer doesn't
 * have access to CSS variables.
 */
import { ImageResponse } from 'next/og';
import { fetchPublicRestaurant } from './fetch-restaurant';

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png' as const;

// Match `apps/web/src/app/globals.css` brand tokens — Satori reads literal
// hex, not CSS variables, so we keep them in sync manually.
const COLOR_BG = '#F2EAD9'; // warm cream
const COLOR_FG = '#2A1F18'; // dark brown
const COLOR_FG_MUTED = '#5A4A3E';
const COLOR_ACCENT = '#C2410C'; // terracotta

interface OgImageOptions {
  eyebrow: string;
  title: string;
  /** Optional sub-copy under the title. */
  description?: string;
}

/**
 * Renders a standard brand OG card. Fetches the public restaurant for the
 * brand name and tagline — falls back to a hard-coded default when the
 * API is unreachable so the build still succeeds.
 */
export async function renderBrandOgImage(opts: OgImageOptions): Promise<ImageResponse> {
  const restaurant = await fetchPublicRestaurant();
  const brand = restaurant?.name ?? 'Szef Donald';
  const tagline = restaurant?.description ?? null;
  // City line on the bottom right — geography is the strongest local-SEO
  // signal in OG previews where they're displayed alongside the URL.
  const cityLine = restaurant
    ? [restaurant.address.city, restaurant.address.country].filter(Boolean).join(', ')
    : null;

  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: COLOR_BG,
        color: COLOR_FG,
        padding: '72px 80px',
        position: 'relative',
      }}
    >
      {/* Accent corner stripe (right) — visual anchor without imagery */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 12,
          height: '100%',
          backgroundColor: COLOR_ACCENT,
        }}
      />

      {/* Eyebrow */}
      <div
        style={{
          display: 'flex',
          fontSize: 22,
          letterSpacing: 6,
          textTransform: 'uppercase',
          color: COLOR_ACCENT,
          fontWeight: 600,
          marginBottom: 32,
        }}
      >
        {opts.eyebrow}
      </div>

      {/* Title — display weight */}
      <div
        style={{
          display: 'flex',
          fontSize: 96,
          lineHeight: 1.05,
          fontWeight: 700,
          letterSpacing: -1,
          maxWidth: 1000,
        }}
      >
        {opts.title}
      </div>

      {/* Description (optional) */}
      {opts.description ? (
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            lineHeight: 1.35,
            color: COLOR_FG_MUTED,
            marginTop: 28,
            maxWidth: 900,
          }}
        >
          {opts.description}
        </div>
      ) : null}

      {/* Bottom bar — brand + city */}
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.5 }}>{brand}</div>
          {tagline ? (
            <div
              style={{
                display: 'flex',
                fontSize: 18,
                color: COLOR_FG_MUTED,
                marginTop: 6,
                maxWidth: 700,
              }}
            >
              {tagline.length > 110 ? `${tagline.slice(0, 107)}…` : tagline}
            </div>
          ) : null}
        </div>
        {cityLine ? (
          <div style={{ display: 'flex', fontSize: 20, color: COLOR_FG_MUTED }}>{cityLine}</div>
        ) : null}
      </div>
    </div>,
    { ...OG_SIZE },
  );
}
