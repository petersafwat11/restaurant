/**
 * Thin wrapper around the self-hosted Umami tracker (cookieless analytics at
 * stats.szefdonald.pl). The tracker script is optional — when it is not loaded
 * (dev, blocked by an extension, env not configured) every call is a no-op.
 *
 * Event names are the funnel steps the owner looks at in Umami:
 *   add_to_cart → checkout_start → order_placed
 * plus the contact actions phone_click / directions_click.
 */
type UmamiData = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    umami?: { track: (event: string, data?: UmamiData) => void };
  }
}

export function track(event: string, data?: UmamiData): void {
  if (typeof window === 'undefined') return;
  try {
    window.umami?.track(event, data);
  } catch {
    // Analytics must never break the page.
  }
}
