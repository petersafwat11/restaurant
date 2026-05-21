import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, ensureOwnerToken, ensureRestaurant, resetDb, resetMenuDb } from './setup-e2e';

describe('seo (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetMenuDb(app);
    await resetDb(app);
    await ensureOwnerToken(app);
    await ensureRestaurant(app);

    const prisma = app.get(PrismaService);
    await prisma.restaurant.updateMany({
      data: { slug: 'seo-e2e', geoPoint: { lat: 52.23, lng: 21.01 } },
    });
    const cat = await prisma.menuCategory.create({
      data: { name: 'Mains', slug: 'mains', position: 0 },
    });
    await prisma.menuItem.create({
      data: {
        categoryId: cat.id,
        name: 'Burger',
        slug: 'burger',
        basePrice: '30.00',
        isAvailable: true,
      },
    });
  });

  async function inject(method: string, url: string, body?: unknown, token?: string) {
    return app.inject({
      method: method as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
      url,
      payload: body as never,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
  }

  it('emits JSON-LD with Restaurant + Menu (public)', async () => {
    const res = await inject('GET', '/api/v1/seo/structured-data/seo-e2e');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body['@context']).toBe('https://schema.org');
    const types = body['@graph'].map((n: { '@type': string }) => n['@type']);
    expect(types).toContain('Restaurant');
    expect(types).toContain('Menu');
  });

  it('serves sitemap.xml and robots.txt', async () => {
    const sm = await inject('GET', '/api/v1/seo/sitemap.xml');
    expect(sm.statusCode).toBe(200);
    expect(sm.headers['content-type']).toContain('application/xml');
    expect(sm.body).toContain('<urlset');
    expect(sm.body).toContain('/menu/mains/burger');

    const rb = await inject('GET', '/api/v1/seo/robots.txt');
    expect(rb.statusCode).toBe(200);
    expect(rb.body).toContain('Sitemap:');
  });

  it('returns meta for a path (public)', async () => {
    const res = await inject(
      'GET',
      '/api/v1/seo/meta?path=/menu',
    );
    expect(res.statusCode).toBe(200);
    expect(res.json().title).toContain('Menu');
    expect(res.json().canonical).toContain('/menu');
  });

  it('404s for an unknown restaurant slug', async () => {
    const res = await inject('GET', '/api/v1/seo/structured-data/nope');
    expect(res.statusCode).toBe(404);
  });
});
