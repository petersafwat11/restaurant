import { useAuthStore } from '@/stores/auth-store';
import { renderHookWithProviders } from '@/test/render-hook';
import { server } from '@/test/setup';
import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { useLogin } from '../use-login';

const API = 'http://localhost:4000/api/v1';

const fakeUser = {
  id: 'u1',
  email: 'user@example.test',
  phone: null,
  firstName: 'A',
  lastName: 'B',
  avatarUrl: null,
  locale: 'en',
  emailVerifiedAt: new Date().toISOString(),
  phoneVerifiedAt: null,
  roles: ['customer'],
  permissions: [],
};

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null, isHydrated: false });
});

describe('useLogin', () => {
  it('sets the session on success', async () => {
    server.use(
      http.post(`${API}/auth/login`, async () =>
        HttpResponse.json({
          accessToken: 'at',
          refreshToken: 'rt',
          expiresIn: 900,
          user: fakeUser,
        }),
      ),
      // The store fires a server action to persist the refresh cookie
      http.post('/api/auth/set-session', async () => HttpResponse.json({ success: true })),
    );

    const { result } = renderHookWithProviders(() => useLogin());
    result.current.mutate({
      email: 'user@example.test',
      password: 'Password123!',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().accessToken).toBe('at');
    expect(useAuthStore.getState().user?.email).toBe('user@example.test');
  });

  it('surfaces an ApiError on 401', async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json(
          {
            statusCode: 401,
            message: 'Invalid credentials',
            error: 'Unauthorized',
            timestamp: '',
          },
          { status: 401 },
        ),
      ),
    );

    const { result } = renderHookWithProviders(() => useLogin());
    result.current.mutate({ email: 'user@example.test', password: 'wrong' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.status).toBe(401);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
