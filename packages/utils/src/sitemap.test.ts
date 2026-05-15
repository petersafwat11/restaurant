import { describe, expect, it } from 'vitest';
import { buildRobots, buildSitemap } from './sitemap';

describe('sitemap', () => {
  it('builds valid sitemap xml and escapes the loc', () => {
    const xml = buildSitemap([
      { loc: 'https://x.test/menu?a=1&b=2', changefreq: 'daily', priority: 0.8 },
    ]);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset');
    expect(xml).toContain('https://x.test/menu?a=1&amp;b=2');
    expect(xml).toContain('<priority>0.8</priority>');
  });

  it('robots allows by default with disallow list + sitemap', () => {
    const r = buildRobots({ sitemapUrl: 'https://x.test/sitemap.xml' });
    expect(r).toContain('User-agent: *');
    expect(r).toContain('Disallow: /account');
    expect(r).toContain('Sitemap: https://x.test/sitemap.xml');
  });

  it('robots blocks everything when allow=false', () => {
    const r = buildRobots({ sitemapUrl: 'https://x.test/sitemap.xml', allow: false });
    expect(r).toContain('Disallow: /');
    expect(r).not.toContain('Disallow: /account');
  });
});
