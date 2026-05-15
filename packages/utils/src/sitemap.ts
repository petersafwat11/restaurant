/**
 * Sitemap / robots.txt builders. Pure string output — the API serves them with
 * the right content-type; thin Next route handlers proxy to the API.
 */

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never';
  priority?: number;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSitemap(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) => {
      const parts = [`    <loc>${xmlEscape(e.loc)}</loc>`];
      if (e.lastmod) parts.push(`    <lastmod>${xmlEscape(e.lastmod)}</lastmod>`);
      if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
      if (e.priority != null) {
        parts.push(`    <priority>${e.priority.toFixed(1)}</priority>`);
      }
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function buildRobots(input: {
  sitemapUrl: string;
  allow?: boolean;
  disallowPaths?: string[];
}): string {
  const lines = ['User-agent: *'];
  if (input.allow === false) {
    lines.push('Disallow: /');
  } else {
    for (const p of input.disallowPaths ?? ['/account', '/checkout', '/cart']) {
      lines.push(`Disallow: ${p}`);
    }
  }
  lines.push(`Sitemap: ${input.sitemapUrl}`);
  return `${lines.join('\n')}\n`;
}
