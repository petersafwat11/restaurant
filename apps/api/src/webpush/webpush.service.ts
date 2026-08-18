import { Inject, Injectable, Logger } from '@nestjs/common';
import webpush, { type PushSubscription } from 'web-push';
import { ENV, type ENV_TYPE } from '../config/config.module';

export interface WebPushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface WebPushNotification {
  title: string;
  body: string;
  url: string;
  tag: string;
  icon: string;
  badge: string;
}

export type WebPushSendResult = 'sent' | 'expired' | 'disabled';

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private readonly enabled: boolean;

  constructor(@Inject(ENV) env: ENV_TYPE) {
    this.enabled = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
    if (this.enabled) {
      webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    }
  }

  async send(
    target: WebPushTarget,
    notification: WebPushNotification,
  ): Promise<WebPushSendResult> {
    if (!this.enabled) {
      this.logger.debug('Web Push skipped because VAPID keys are not configured');
      return 'disabled';
    }

    const subscription: PushSubscription = {
      endpoint: target.endpoint,
      keys: { p256dh: target.p256dh, auth: target.auth },
    };

    try {
      await webpush.sendNotification(subscription, JSON.stringify(notification), {
        urgency: 'high',
        TTL: 60 * 60 * 24,
      });
      return 'sent';
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) return 'expired';
      throw error;
    }
  }
}
