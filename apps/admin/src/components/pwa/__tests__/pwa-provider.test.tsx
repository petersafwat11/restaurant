import { PwaProvider, registerAdminServiceWorker, usePwa } from '@/components/pwa/pwa-provider';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeRegistration(): ServiceWorkerRegistration {
  return {
    installing: null,
    waiting: null,
    active: null,
    scope: 'http://localhost:3001/',
    updateViaCache: 'none',
    navigationPreload: {} as NavigationPreloadManager,
    pushManager: {} as PushManager,
    unregister: vi.fn(),
    update: vi.fn(),
    showNotification: vi.fn(),
    getNotifications: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as ServiceWorkerRegistration;
}

function Probe() {
  const pwa = usePwa();
  return (
    <div>
      <output data-testid="online">{String(pwa.online)}</output>
      <output data-testid="installable">{String(pwa.installAvailable)}</output>
      <button type="button" onClick={() => void pwa.install()}>
        install
      </button>
    </div>
  );
}

describe('PwaProvider', () => {
  const register = vi.fn();

  beforeEach(() => {
    register.mockResolvedValue(makeRegistration());
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register,
        controller: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers the root service worker without using the HTTP cache', async () => {
    await registerAdminServiceWorker();

    expect(register).toHaveBeenCalledWith('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
  });

  it('captures the browser install event and invokes its prompt', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const installEvent = new Event('beforeinstallprompt');
    Object.assign(installEvent, {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    });

    render(
      <PwaProvider>
        <Probe />
      </PwaProvider>,
    );
    window.dispatchEvent(installEvent);

    await waitFor(() => expect(screen.getByTestId('installable').textContent).toBe('true'));
    fireEvent.click(screen.getByRole('button', { name: 'install' }));
    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
  });

  it('tracks offline and online transitions', async () => {
    render(
      <PwaProvider>
        <Probe />
      </PwaProvider>,
    );

    window.dispatchEvent(new Event('offline'));
    await waitFor(() => expect(screen.getByTestId('online').textContent).toBe('false'));

    window.dispatchEvent(new Event('online'));
    await waitFor(() => expect(screen.getByTestId('online').textContent).toBe('true'));
  });
});
