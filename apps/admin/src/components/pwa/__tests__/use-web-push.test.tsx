import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWebPush } from '../use-web-push';

const { subscribeWebPush, unsubscribeWebPush, registerAdminServiceWorker } = vi.hoisted(() => ({
  subscribeWebPush: vi.fn(),
  unsubscribeWebPush: vi.fn(),
  registerAdminServiceWorker: vi.fn(),
}));

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_API_URL: 'http://localhost:4000/api/v1',
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'BEl6YWFsaWQtdmFwaWQta2V5',
  },
}));

vi.mock('@/lib/api-client', () => ({
  getApiClient: () => ({
    notifications: { subscribeWebPush, unsubscribeWebPush },
  }),
}));

vi.mock('../pwa-provider', () => ({ registerAdminServiceWorker }));

describe('useWebPush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscribeWebPush.mockResolvedValue({ success: true });
    unsubscribeWebPush.mockResolvedValue({ success: true });
    Object.defineProperty(window, 'PushManager', { configurable: true, value: class {} });
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { permission: 'default', requestPermission: vi.fn().mockResolvedValue('granted') },
    });
  });

  it('subscribes only after enable and persists the browser subscription', async () => {
    const subscription = {
      endpoint: 'https://push.example.test/device-1',
      toJSON: () => ({
        endpoint: 'https://push.example.test/device-1',
        expirationTime: null,
        keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
      }),
      unsubscribe: vi.fn().mockResolvedValue(true),
    };
    const pushManager = {
      getSubscription: vi.fn().mockResolvedValue(null),
      subscribe: vi.fn().mockResolvedValue(subscription),
    };
    const registration = { pushManager } as unknown as ServiceWorkerRegistration;
    registerAdminServiceWorker.mockResolvedValue(registration);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue(null),
        ready: Promise.resolve(registration),
      },
    });

    const { result } = renderHook(() => useWebPush());
    await waitFor(() => expect(result.current.state).toBe('idle'));
    expect(subscribeWebPush).not.toHaveBeenCalled();

    await act(async () => {
      expect(await result.current.enable()).toBe(true);
    });

    expect(pushManager.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    );
    expect(subscribeWebPush).toHaveBeenCalledWith({
      endpoint: subscription.endpoint,
      expirationTime: null,
      keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
      userAgent: navigator.userAgent,
    });
    expect(result.current.state).toBe('enabled');
  });

  it('reconciles an existing browser subscription with the API on refresh', async () => {
    const subscription = {
      endpoint: 'https://push.example.test/device-existing',
      toJSON: () => ({
        endpoint: 'https://push.example.test/device-existing',
        expirationTime: null,
        keys: { p256dh: 'existing-p256dh', auth: 'existing-auth' },
      }),
      unsubscribe: vi.fn().mockResolvedValue(true),
    };
    const registration = {
      active: {} as ServiceWorker,
      pushManager: { getSubscription: vi.fn().mockResolvedValue(subscription) },
    } as unknown as ServiceWorkerRegistration;
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue(registration),
        ready: Promise.resolve(registration),
      },
    });

    const { result } = renderHook(() => useWebPush());

    await waitFor(() => expect(result.current.state).toBe('enabled'));
    expect(subscribeWebPush).toHaveBeenCalledWith({
      endpoint: subscription.endpoint,
      expirationTime: null,
      keys: { p256dh: 'existing-p256dh', auth: 'existing-auth' },
      userAgent: navigator.userAgent,
    });
  });
});
