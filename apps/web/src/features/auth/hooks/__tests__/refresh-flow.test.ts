import { server } from '@/test/setup';
import { createApiClient } from '@repo/api-client';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

const API = 'http://localhost:4000/api/v1';

describe('api-client refresh flow', () => {
  it('retries a 401 once with a fresh access token, then returns the response', async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/auth/me`, ({ request }) => {
        calls++;
        const auth = request.headers.get('authorization');
        if (calls === 1 || auth !== 'Bearer fresh-token') {
          return HttpResponse.json(
            {
              statusCode: 401,
              message: 'Unauthorized',
              error: 'Unauthorized',
              timestamp: '',
            },
            { status: 401 },
          );
        }
        return HttpResponse.json({
          id: 'u1',
          email: 'user@example.test',
          phone: null,
          firstName: null,
          lastName: null,
          avatarUrl: null,
          locale: 'en',
          emailVerifiedAt: null,
          phoneVerifiedAt: null,
          roles: ['customer'],
          permissions: [],
        });
      }),
    );

    let token = 'expired-token';
    const client = createApiClient({
      baseUrl: API,
      getAccessToken: () => token,
      refreshAccessToken: async () => {
        token = 'fresh-token';
        return token;
      },
    });

    const me = await client.auth.me();
    expect(me.email).toBe('user@example.test');
    expect(calls).toBe(2);
  });
});
