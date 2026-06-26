import { Inject, Injectable, Logger } from '@nestjs/common';
import webpush, { type PushSubscription, type SendResult } from 'web-push';
import { ENV, type ENV_TYPE } from '../config/config.module';

export interface WebPushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface WebPushNotification {
  title: string;
  body: string;
  /** URL opened when the notification is clicked (handled by the service worker). */
  url: string;
  tag?: string;
}

export interface WebPushSendResult {
  ok: boolean;
  /** True when the push service reports the subscription is gone (404/410). */
  expired: boolean;
}

/**
 * Browser Web Push via VAPID. Wraps the `web-push` library. When VAPID keys are
 * absent (dev), sends become no-ops so the rest of the pipeline still runs.
 * `expired` lets callers prune dead subscriptions (the push endpoint replies
 * 404/410 once a browser has unsubscribed or the subscription rotated).
 */
@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private readonly enabled: boolean;

  constructor(@Inject(ENV) private readonly env: ENV_TYPE) {
    this.enabled = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
    if (this.enabled) {
      webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  async send(target: WebPushTarget, payload: WebPushNotification): Promise<WebPushSendResult> {
    if (!this.enabled) {
      this.logger.log(`[WebPush → ${target.endpoint}] ${payload.title} — ${payload.body}`);
      return { ok: true, expired: false };
    }

    const subscription: PushSubscription = {
      endpoint: target.endpoint,
      keys: { p256dh: target.p256dh, auth: target.auth },
    };

    try {
      const res: SendResult = await webpush.sendNotification(
        subscription,
        JSON.stringify(payload),
      );
      return { ok: res.statusCode >= 200 && res.statusCode < 300, expired: false };
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        return { ok: false, expired: true };
      }
      this.logger.warn(`web-push send failed (${statusCode ?? 'unknown'}): ${String(err)}`);
      return { ok: false, expired: false };
    }
  }
}
