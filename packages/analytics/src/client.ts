import { PostHog } from 'posthog-node';
import {
  ANALYTICS_EVENT_SCHEMAS,
  type AnalyticsEventName,
  type AnalyticsEventPayload,
} from './events';

export interface AnalyticsConfig {
  key?: string;
  host?: string;
}

export interface Analytics {
  enabled: boolean;
  capture<E extends AnalyticsEventName>(event: E, payload: AnalyticsEventPayload<E>): void;
  shutdown(): Promise<void>;
}

function distinctIdFor(event: AnalyticsEventName, payload: Record<string, unknown>): string {
  if (event === 'referral_completed') return String(payload.refereeId);
  const uid = payload.userId;
  return typeof uid === 'string' && uid.length > 0 ? uid : 'anonymous';
}

/**
 * Server capture client. No-ops (but still validates payloads) when `key` is
 * empty — same "empty env → safe stub" contract as the rest of the platform,
 * so dev/test/CI never need a real PostHog project.
 */
export function createAnalytics(config: AnalyticsConfig): Analytics {
  const enabled = Boolean(config.key);
  const client = enabled
    ? new PostHog(config.key as string, {
        host: config.host || 'https://app.posthog.com',
        flushAt: 1,
      })
    : null;

  return {
    enabled,
    capture(event, payload) {
      // Always validate — a bad payload is a programming error we want to
      // surface even when capture is disabled.
      ANALYTICS_EVENT_SCHEMAS[event].parse(payload);
      if (!client) return;
      client.capture({
        distinctId: distinctIdFor(event, payload as Record<string, unknown>),
        event,
        properties: payload as Record<string, unknown>,
      });
    },
    async shutdown() {
      if (client) await client.shutdown();
    },
  };
}
