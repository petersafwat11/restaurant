'use client';

import { track } from '@/lib/analytics';
import Script from 'next/script';
import { useEffect } from 'react';

type Props = { scriptUrl: string; websiteId: string; domains?: string };

/**
 * Loads the Umami tracker (cookieless, no consent banner needed) and records
 * contact actions site-wide: any click on a `tel:` link is a phone_click, any
 * click on a Google Maps link is a directions_click. Page views (including
 * client-side navigations) are tracked automatically by the script.
 */
export function Analytics({ scriptUrl, websiteId, domains }: Props) {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]');
      if (!a) return;
      const href = a.getAttribute('href') ?? '';
      if (href.startsWith('tel:')) {
        track('phone_click', { path: window.location.pathname });
      } else if (/google\.[a-z.]+\/maps|maps\.google\.|maps\.app\.goo\.gl|g\.page/.test(href)) {
        track('directions_click', { path: window.location.pathname });
      }
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  return (
    <Script
      src={scriptUrl}
      data-website-id={websiteId}
      {...(domains ? { 'data-domains': domains } : {})}
      strategy="afterInteractive"
    />
  );
}
