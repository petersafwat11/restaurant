'use client';

import { usePwa } from '@/components/pwa/pwa-provider';
import { useWebPush } from '@/components/pwa/use-web-push';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { notify } from '@/lib/notify';
import { Button } from '@repo/ui';
import { BellRing, Check, Info, LoaderCircle, Share2, X } from 'lucide-react';
import * as React from 'react';

const DISMISSED_SESSION_KEY = 'szef_donald_push_prompt_dismissed';

export function PushPermissionPrompt() {
  const { has } = usePermissions();
  const canReadOrders = typeof has === 'function' && has('order:read');
  const webPush = useWebPush();
  const pwa = usePwa();
  const [dismissed, setDismissed] = React.useState(true);

  React.useEffect(() => {
    try {
      const isDismissed = sessionStorage.getItem(DISMISSED_SESSION_KEY) === 'true';
      setDismissed(isDismissed);
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(DISMISSED_SESSION_KEY, 'true');
    } catch {
      // ignore storage errors
    }
    setDismissed(true);
  };

  if (!canReadOrders || dismissed || webPush.enabled) {
    return null;
  }

  // iOS in normal Safari browser (not installed as standalone PWA yet)
  if (pwa.isIos && !pwa.isStandalone) {
    return (
      <div className="relative border-b border-accent/20 bg-accent-muted/60 px-4 py-3 text-fg sm:px-6">
        <div className="mx-auto flex max-w-page-max items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-button bg-accent text-accent-contrast">
              <Share2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-small font-semibold text-fg">
                iPhone / iPad Alert Notice
              </p>
              <p className="text-caption-admin text-fg-muted">
                To receive order sound and push alerts when Donald Admin is closed, tap{' '}
                <span className="font-semibold text-fg">Share (⎋)</span> in Safari and choose{' '}
                <span className="font-semibold text-fg">&ldquo;Add to Home Screen&rdquo;</span>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss notice"
            className="shrink-0 rounded-button p-1.5 text-fg-subtle hover:bg-surface-raised hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // If push is supported & idle (not enabled yet)
  if (webPush.supported && webPush.configured && webPush.state === 'idle') {
    return (
      <div className="relative border-b border-accent/30 bg-accent-muted/80 px-4 py-3 text-fg sm:px-6 shadow-sm">
        <div className="mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between max-w-page-max">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-button bg-accent text-accent-contrast shadow-sm">
              <BellRing className="h-5 w-5 animate-pulse" />
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-accent border-2 border-surface" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-small font-bold text-fg">
                Enable Order Push Notifications &amp; Sound
              </p>
              <p className="text-caption-admin text-fg-muted">
                Receive instant ring chimes and push alerts when new orders arrive, even when this app is closed.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Button
              type="button"
              variant="primary"
              disabled={webPush.busy}
              onClick={async () => {
                const ok = await webPush.enable();
                if (ok) {
                  notify('success', 'Order push notifications enabled on this device.');
                  handleDismiss();
                } else if (Notification.permission === 'denied') {
                  notify('error', 'Push permission was denied in browser settings.');
                }
              }}
            >
              {webPush.busy ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Enable Push Alerts
            </Button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss alert prompt"
              className="rounded-button p-2 text-fg-subtle hover:bg-surface-raised hover:text-fg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If permission was denied in browser settings
  if (webPush.state === 'denied') {
    return (
      <div className="relative border-b border-negative/20 bg-negative/10 px-4 py-2.5 text-fg sm:px-6">
        <div className="mx-auto flex max-w-page-max items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Info className="h-4 w-4 text-negative shrink-0" />
            <p className="text-caption-admin text-fg-muted">
              Notifications are blocked in your browser. Allow notifications in site settings to receive order alerts.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss warning"
            className="shrink-0 rounded-button p-1 text-fg-subtle hover:text-fg"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
