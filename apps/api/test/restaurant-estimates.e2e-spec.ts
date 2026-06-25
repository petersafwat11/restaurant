import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createTestApp,
  ensureOwnerToken,
  ensureRestaurant,
  resetDb,
  resetMenuDb,
} from './setup-e2e';

describe('restaurant estimated-time ranges (e2e)', () => {
  let app: NestFastifyApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetMenuDb(app);
    await resetDb(app);
    token = await ensureOwnerToken(app);
    await ensureRestaurant(app);
  });

  async function inject(method: string, url: string, body?: unknown, bearer?: string) {
    return app.inject({
      method: method as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
      url,
      payload: body as never,
      headers: bearer ? { authorization: `Bearer ${bearer}` } : undefined,
    });
  }

  it('persists a valid min/max range and exposes it publicly', async () => {
    const patch = await inject(
      'PATCH',
      '/api/v1/restaurant',
      {
        estimatedDeliveryMinutesMin: 30,
        estimatedDeliveryMinutesMax: 45,
        estimatedPickupMinutesMin: 12,
        estimatedPickupMinutesMax: 20,
      },
      token,
    );
    expect(patch.statusCode).toBe(200);

    const pub = await inject('GET', '/api/v1/restaurant');
    expect(pub.statusCode).toBe(200);
    const body = pub.json();
    expect(body.estimatedDeliveryMinutesMin).toBe(30);
    expect(body.estimatedDeliveryMinutesMax).toBe(45);
    expect(body.estimatedPickupMinutesMin).toBe(12);
    expect(body.estimatedPickupMinutesMax).toBe(20);
  });

  it('allows clearing a range (both null)', async () => {
    const patch = await inject(
      'PATCH',
      '/api/v1/restaurant',
      { estimatedPickupMinutesMin: null, estimatedPickupMinutesMax: null },
      token,
    );
    expect(patch.statusCode).toBe(200);
  });

  it('rejects min greater than max', async () => {
    const patch = await inject(
      'PATCH',
      '/api/v1/restaurant',
      { estimatedPickupMinutesMin: 30, estimatedPickupMinutesMax: 10 },
      token,
    );
    expect(patch.statusCode).toBe(400);
  });

  it('rejects a half-configured range (min without max)', async () => {
    const patch = await inject(
      'PATCH',
      '/api/v1/restaurant',
      { estimatedDeliveryMinutesMin: 30 },
      token,
    );
    expect(patch.statusCode).toBe(400);
  });
});
