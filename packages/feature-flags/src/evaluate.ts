import { FLAG_CATALOG, type FeatureFlagKey, isFeatureFlagKey } from './catalog';

export interface FlagDbRow {
  key: string;
  enabled: boolean;
  rolloutPercent: number;
}

export interface EvaluateContext {
  /** Stable id used for percentage rollout bucketing (e.g. userId). */
  subjectId?: string | null;
}

export interface EvaluateOptions {
  /** Parsed `FEATURE_FLAG_OVERRIDES` — highest precedence. */
  envOverrides?: Partial<Record<FeatureFlagKey, boolean>>;
  /** Persisted rows from the `FeatureFlag` table. */
  dbRows?: FlagDbRow[];
}

/**
 * Deterministic 0–99 bucket from subjectId+key (FNV-1a). Same subject always
 * lands in the same bucket for a given flag, so a rollout is sticky.
 */
export function rolloutBucket(subjectId: string, key: string): number {
  let h = 0x811c9dc5;
  const s = `${key}:${subjectId}`;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 100;
}

/**
 * Resolve a flag. Precedence: env override → DB row (with optional
 * percentage rollout) → catalog default.
 */
export function evaluateFlag(
  key: FeatureFlagKey,
  ctx: EvaluateContext = {},
  opts: EvaluateOptions = {},
): boolean {
  const envOverride = opts.envOverrides?.[key];
  if (envOverride !== undefined) return envOverride;

  const row = opts.dbRows?.find((r) => r.key === key);
  if (row) {
    if (!row.enabled) return false;
    if (row.rolloutPercent >= 100) return true;
    if (row.rolloutPercent <= 0) return false;
    const subject = ctx.subjectId;
    if (!subject) return false; // anonymous → not in a partial rollout
    return rolloutBucket(subject, key) < row.rolloutPercent;
  }

  return FLAG_CATALOG[key].default;
}

export function evaluateAll(
  ctx: EvaluateContext = {},
  opts: EvaluateOptions = {},
): Record<FeatureFlagKey, boolean> {
  const out = {} as Record<FeatureFlagKey, boolean>;
  for (const key of Object.keys(FLAG_CATALOG) as FeatureFlagKey[]) {
    out[key] = evaluateFlag(key, ctx, opts);
  }
  return out;
}

/** Parse `key=on,key2=off` (1/0/true/false/on/off) into typed overrides. */
export function parseEnvOverrides(
  raw: string | undefined | null,
): Partial<Record<FeatureFlagKey, boolean>> {
  const out: Partial<Record<FeatureFlagKey, boolean>> = {};
  if (!raw) return out;
  for (const pair of raw.split(',')) {
    const [k, v] = pair.split('=').map((x) => x.trim());
    if (!k || v === undefined || !isFeatureFlagKey(k)) continue;
    const truthy = ['1', 'true', 'on', 'yes'].includes(v.toLowerCase());
    const falsy = ['0', 'false', 'off', 'no'].includes(v.toLowerCase());
    if (truthy) out[k] = true;
    else if (falsy) out[k] = false;
  }
  return out;
}
