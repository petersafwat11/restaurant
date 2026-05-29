import type { MetadataRoute } from 'next';

/**
 * Native `MetadataRoute` robots — replaces the prior `app/robots.txt/route.ts`
 * proxy to `/seo/robots.txt`. Native gives us strongly typed control and skips
 * the API hop on every crawl.
 *
 * AI crawlers (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended)
 * are intentionally NOT blocked — being crawlable by them is a precondition for
 * Generative Engine Optimization. See docs/seo/seo-geo-strategy.md Part E.
 */
function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
}

export default function robots(): MetadataRoute.Robots {
  const base = baseUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/cart',
          '/checkout',
          '/account',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
          '/track/',
          '/staff',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
