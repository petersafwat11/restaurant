'use client';

import { SettingsSectionCard } from '@repo/ui';
import { BellRing } from 'lucide-react';
import * as React from 'react';
import { type WebPushState, useRegisterWebPush } from '../hooks/use-register-web-push';

const STATUS_COPY: Record<WebPushState, string> = {
  unsupported: 'This browser does not support background push notifications.',
  unconfigured: 'Web push is not configured on the server (missing VAPID key).',
  idle: 'Get a notification on this device the moment a customer places an order — even when the dashboard is closed.',
  subscribing: 'Enabling…',
  enabled: 'Background order alerts are on for this device.',
  denied: 'Notifications are blocked. Allow them in your browser settings, then try again.',
  error: 'Something went wrong. Try again.',
};

/**
 * Settings card that lets a staff member opt this specific device into
 * background "new order" web-push alerts (admin PWA). Subscription is stored
 * per-user on the server, so enabling it on a phone + a desktop both work.
 */
export function WebPushToggle() {
  const { state, supported, configured, enable, disable } = useRegisterWebPush();

  const canAct = supported && configured && state !== 'subscribing';
  const isOn = state === 'enabled';

  return (
    <SettingsSectionCard
      id="order-alerts"
      title="Background order alerts"
      description="Push a notification to this device when new orders arrive."
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-button bg-accent-muted text-accent">
            <BellRing className="h-5 w-5" />
          </div>
          <p className="text-small text-fg-muted">{STATUS_COPY[state]}</p>
        </div>
        <button
          type="button"
          disabled={!canAct}
          onClick={() => (isOn ? disable() : enable())}
          className={`h-9 shrink-0 rounded-button px-4 text-small font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            isOn
              ? 'border border-border/[var(--border-strong-alpha)] text-fg hover:bg-surface-warm/30'
              : 'bg-accent text-bg hover:bg-accent-hover'
          }`}
        >
          {state === 'subscribing' ? 'Enabling…' : isOn ? 'Disable' : 'Enable'}
        </button>
      </div>
    </SettingsSectionCard>
  );
}
