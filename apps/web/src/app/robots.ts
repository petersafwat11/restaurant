import type { MetadataRoute } from 'next';

/**
 * robots.txt. Search engines and AI crawlers are explicitly welcome — being
 * crawlable by them is a precondition for appearing in Google / Bing and in
 * ChatGPT, Claude, Perplexity, Gemini and Apple Intelligence answers.
 *
 * A crawler obeys only the most specific `User-agent` group that matches it,
 * so every named group repeats the full private-path disallow list (otherwise
 * e.g. GPTBot would be allowed into /checkout and /account).
 */
function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
}

const PRIVATE_PATHS = [
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
  '/en/cart',
  '/en/checkout',
  '/en/account',
  '/en/login',
  '/en/register',
  '/en/forgot-password',
  '/en/reset-password',
  '/en/verify-email',
  '/en/track/',
  '/en/staff',
];

export const AI_AND_SEARCH_BOTS = [
  'Googlebot',
  'Bingbot',
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'PerplexityBot',
  'Google-Extended',
  'Applebot',
  'Applebot-Extended',
] as const;

export default function robots(): MetadataRoute.Robots {
  const base = baseUrl();
  return {
    rules: [
      ...AI_AND_SEARCH_BOTS.map((userAgent) => ({
        userAgent,
        allow: ['/', '/llms.txt'],
        disallow: PRIVATE_PATHS,
      })),
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
    ],
    sitemap: `${base}/sitemap.xml`,
    // No `Host:` line: it is a non-standard (Yandex-only) directive that expects a
    // bare hostname; with a full URL some validators (incl. older Lighthouse
    // robots-txt audits) flag the file as invalid, and Google ignores it anyway.
    // The canonical host is enforced by the www→apex redirect + <link rel=canonical>.
  };
}
