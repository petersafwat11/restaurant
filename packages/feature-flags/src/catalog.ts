/**
 * Feature-flag catalog — the single source of truth for which flags exist
 * and their safe defaults. Launch-gated capabilities default OFF so a fresh
 * environment ships dark; ops flips them on via env override or the
 * `FeatureFlag` table during the soft launch.
 */
export interface FlagDefinition {
  description: string;
  /** Safe default when no env override and no DB row exists. */
  default: boolean;
}

export const FLAG_CATALOG = {
  'loyalty.redemption': {
    description: 'Allow redeeming loyalty points at checkout',
    default: true,
  },
  'referral.program': {
    description: 'Referral code capture + reward on first order',
    default: true,
  },
  'marketing.new_landing': {
    description: 'Serve the new marketing landing aggregation',
    default: false,
  },
  'mobile.push_v2': {
    description: 'New mobile push payload + deep links',
    default: false,
  },
  soft_launch: {
    description: 'Master soft-launch gate (kill switch)',
    default: false,
  },
} as const satisfies Record<string, FlagDefinition>;

export type FeatureFlagKey = keyof typeof FLAG_CATALOG;

export const FEATURE_FLAG_KEYS = Object.keys(FLAG_CATALOG) as FeatureFlagKey[];

export function isFeatureFlagKey(value: string): value is FeatureFlagKey {
  return value in FLAG_CATALOG;
}
