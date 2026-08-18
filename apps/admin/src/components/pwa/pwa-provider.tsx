'use client';

import * as React from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

export interface PwaContextValue {
  supported: boolean;
  online: boolean;
  isIos: boolean;
  isStandalone: boolean;
  installAvailable: boolean;
  updateReady: boolean;
  install: () => Promise<InstallOutcome>;
  applyUpdate: () => void;
}

const DEFAULT_VALUE: PwaContextValue = {
  supported: false,
  online: true,
  isIos: false,
  isStandalone: false,
  installAvailable: false,
  updateReady: false,
  install: async () => 'unavailable',
  applyUpdate: () => undefined,
};

const PwaContext = React.createContext<PwaContextValue>(DEFAULT_VALUE);

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches || iosNavigator.standalone === true
  );
}

function detectIos(): boolean {
  if (typeof window === 'undefined') return false;
  const platform = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(platform) ||
    (/Macintosh/.test(platform) && navigator.maxTouchPoints > 1)
  );
}

export async function registerAdminServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register('/sw.js', {
    scope: '/',
    updateViaCache: 'none',
  });
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = React.useState(true);
  const [isIos, setIsIos] = React.useState(false);
  const [isStandalone, setIsStandalone] = React.useState(false);
  const [installPrompt, setInstallPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [updateReady, setUpdateReady] = React.useState(false);
  const registrationRef = React.useRef<ServiceWorkerRegistration | null>(null);
  const reloadForUpdateRef = React.useRef(false);

  const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator;

  React.useEffect(() => {
    setOnline(navigator.onLine);
    setIsIos(detectIos());
    setIsStandalone(detectStandalone());

    const displayMode = window.matchMedia('(display-mode: standalone)');
    const syncDisplayMode = () => setIsStandalone(detectStandalone());
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };
    const onControllerChange = () => {
      if (!reloadForUpdateRef.current) return;
      reloadForUpdateRef.current = false;
      window.location.reload();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    displayMode.addEventListener('change', syncDisplayMode);
    navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange);

    let active = true;
    let registration: ServiceWorkerRegistration | null = null;
    let installingWorker: ServiceWorker | null = null;

    const inspectInstallingWorker = () => {
      installingWorker = registration?.installing ?? null;
      if (!installingWorker) return;
      installingWorker.addEventListener('statechange', () => {
        if (installingWorker?.state === 'installed' && navigator.serviceWorker.controller) {
          setUpdateReady(true);
        }
      });
    };

    if (supported) {
      registerAdminServiceWorker()
        .then((nextRegistration) => {
          if (!active || !nextRegistration) return;
          registration = nextRegistration;
          registrationRef.current = nextRegistration;
          setUpdateReady(Boolean(nextRegistration.waiting));
          nextRegistration.addEventListener('updatefound', inspectInstallingWorker);
        })
        .catch(() => {
          // The dashboard remains fully usable as a normal web app.
        });
    }

    return () => {
      active = false;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      displayMode.removeEventListener('change', syncDisplayMode);
      navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange);
      registration?.removeEventListener('updatefound', inspectInstallingWorker);
    };
  }, [supported]);

  const install = React.useCallback(async (): Promise<InstallOutcome> => {
    if (!installPrompt) return 'unavailable';
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);
      if (choice.outcome === 'accepted') setIsStandalone(true);
      return choice.outcome;
    } catch {
      setInstallPrompt(null);
      return 'unavailable';
    }
  }, [installPrompt]);

  const applyUpdate = React.useCallback(() => {
    const waiting = registrationRef.current?.waiting;
    if (!waiting) return;
    reloadForUpdateRef.current = true;
    waiting.postMessage({ type: 'SKIP_WAITING' });
  }, []);

  const value = React.useMemo<PwaContextValue>(
    () => ({
      supported,
      online,
      isIos,
      isStandalone,
      installAvailable: Boolean(installPrompt),
      updateReady,
      install,
      applyUpdate,
    }),
    [supported, online, isIos, isStandalone, installPrompt, updateReady, install, applyUpdate],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa(): PwaContextValue {
  return React.useContext(PwaContext);
}
