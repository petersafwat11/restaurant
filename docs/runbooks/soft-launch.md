# Runbook: Soft Launch (feature-flag rollout)

Flags are evaluated server-side with precedence
**env override → `FeatureFlag` row (+ % rollout) → catalog default**
(`@repo/feature-flags`). `soft_launch` is the master kill switch.

## Catalog (defaults)

| Flag | Default | Purpose |
|------|---------|---------|
| `loyalty.redemption` | on | Redeem points at checkout |
| `referral.program` | on | Referral capture + reward |
| `marketing.new_landing` | off | New landing aggregation |
| `mobile.push_v2` | off | New push payload/deep links |
| `soft_launch` | off | Master gate / kill switch |

## Rollout sequence

1. **Dark deploy.** Ship with `soft_launch=off`. Verify health, dashboards,
   Sentry quiet, k6 budgets green on staging.
2. **Internal.** `PATCH /admin/feature-flags/soft_launch { enabled:true,
   rolloutPercent:0 }` then add staff userIds via env override
   `FEATURE_FLAG_OVERRIDES=soft_launch=on` on a canary instance.
3. **Percentage.** `rolloutPercent: 5 → 25 → 50 → 100`. Bucketing is sticky
   per userId (deterministic hash) so a user's experience doesn't flicker.
4. **Full.** `rolloutPercent:100`. Leave the flag in place one release cycle
   before removing the gate from code.

## Kill switch

Fastest → slowest:
1. Env override: set `FEATURE_FLAG_OVERRIDES=soft_launch=off` and restart
   (overrides DB + default instantly, no DB write).
2. `PATCH /admin/feature-flags/soft_launch { enabled:false }` (takes effect
   on next flag resolution; clients cache 5 min).

## Monitoring during rollout

- Sentry error rate (API filter reports 5xx/unhandled only).
- PostHog: `order_placed`, `payment_succeeded`, `signup`,
  `loyalty_redeemed`, `referral_completed` volumes vs. baseline.
- k6 budgets (see `load/README.md`) re-run at 50% and 100%.

## Rollback

Flag-gated features: flip the flag (above) — no redeploy.
Code/schema regressions: redeploy previous image; migrations this sprint are
additive (`add_sprint_11_tables`, `add_sprint_12_tables`) so a forward-only
DB with an older app image is safe.
