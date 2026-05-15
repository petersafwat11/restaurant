# Load testing (k6)

Scripts model the two hottest paths for the soft launch: order placement and
auth. They are **not** wired into CI by default (they need a running API +
seeded data); run them against a staging environment before launch.

## Prerequisites

- [k6](https://k6.io/docs/get-started/installation/) installed
- A reachable API and (for the full order path) a seeded restaurant

## Run

```bash
# Smoke (menu read only — safe anywhere)
k6 run -e BASE_URL=https://staging-api.example.com load/order-flow.js

# Full order path (needs a seeded restaurant + item)
k6 run \
  -e BASE_URL=https://staging-api.example.com \
  -e RESTAURANT_ID=rst_xxx \
  -e ITEM_ID=itm_xxx \
  load/order-flow.js

k6 run -e BASE_URL=https://staging-api.example.com load/auth-flow.js
```

## Budgets (thresholds in the scripts)

| Path | Metric | Budget |
|------|--------|--------|
| Menu/order reads | p95 latency | < 800 ms |
| Place order | p95 latency | < 1200 ms |
| Login | p95 latency | < 700 ms |
| Register | p95 latency | < 1500 ms (bcrypt cost 12) |
| All | error rate | < 1–2 % |

A run that breaches a threshold exits non-zero — wire that into the
pre-launch checklist gate, not the per-PR CI.

## Interpreting results

- Sustained p95 regressions on `placeOrder` usually mean DB contention on the
  order-number sequence or the idempotency Redis round-trip — check the
  `orders` + `redis` spans in Sentry/APM.
- Error spikes at ramp top with healthy latency point at connection-pool
  exhaustion (Prisma `connection_limit`) — tune the pool before adding VUs.
