import type { OrderAttributionDto } from '@repo/types';

/**
 * First-touch order-source attribution. On the visitor's first page view we
 * record the UTM parameters, the referrer *host* (never the full URL) and the
 * landing pathname in a first-party cookie, then send it with the order so the
 * owner can see which channels (Google, Maps, AI assistants…) bring orders.
 *
 * First touch wins: an existing cookie is never overwritten. Internal
 * navigation (referrer = our own host) records no referrer.
 */
const COOKIE = 'sd_src';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type StoredAttribution = Omit<OrderAttributionDto, 'heardAboutUs'>;

function readCookie(): StoredAttribution | null {
  if (typeof document === 'undefined') return null;
  const raw = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return parsed && typeof parsed === 'object' ? (parsed as StoredAttribution) : null;
  } catch {
    return null;
  }
}

function clip(value: string | null | undefined, max: number): string | null {
  const v = value?.trim();
  return v ? v.slice(0, max) : null;
}

/** Call once per page load (client only). No-op when already captured. */
export function captureFirstTouch(): void {
  if (typeof window === 'undefined' || readCookie()) return;
  try {
    const url = new URL(window.location.href);
    let referrerHost: string | null = null;
    if (document.referrer) {
      const host = new URL(document.referrer).hostname.toLowerCase();
      if (host && host !== url.hostname.toLowerCase()) referrerHost = host;
    }
    const data: StoredAttribution = {
      utmSource: clip(url.searchParams.get('utm_source'), 100),
      utmMedium: clip(url.searchParams.get('utm_medium'), 100),
      utmCampaign: clip(url.searchParams.get('utm_campaign'), 150),
      referrerHost,
      landingPath: url.pathname.slice(0, 300),
    };
    const secure = url.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(data))}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
  } catch {
    // Attribution is best-effort and must never break the page.
  }
}

/** The stored first-touch data (or null) to send with an order. */
export function readFirstTouch(): StoredAttribution | null {
  return readCookie();
}
