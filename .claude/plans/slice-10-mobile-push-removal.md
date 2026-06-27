# Slice 10 / Phase A — remove mobile app + Expo/push code (DB kept)

Destructive cleanup. Committed on `feat/stripe-eu-payment-readiness` (not pushed) → git-recoverable.
**Do NOT commit/push. Do NOT hand-edit pnpm-lock.yaml. KEEP Prisma PushToken / NotificationPreference push columns.**

## Delete (directories / files)
- `apps/mobile/**`, `packages/ui-mobile/**` (144 files)
- `apps/api/src/jobs/push.processor.ts`
- `packages/utils/src/deep-link.ts` + `deep-link.test.ts`
- `tooling/tsconfig/react-native.json` (only the deleted mobile/ui-mobile consume it)

## Edit — packages
- `packages/utils/src/index.ts`: drop `export * from './deep-link'`
- `packages/jobs/src/queues.ts`: drop `QUEUE_PUSH`, `push:` in QUEUE_NAMES, `JOB_PUSH_*` (WELCOME/ORDER_STATUS/TOKEN_CLEANUP/LOYALTY)
- `packages/jobs/src/payloads.ts`: drop Push* payload schemas (Welcome/OrderStatus/Loyalty/TokenCleanup)
- `packages/jobs/src/index.ts`: barrel re-exports `*` → no change needed (verify)
- `packages/types/src/notification.ts`: drop `PUSH_PLATFORMS`, `RegisterPushTokenSchema`/Dto. KEEP NotificationPreference push fields.
- `packages/api-client/src/client.ts`: drop `registerPushToken`/`unregisterPushToken` + their type imports
- `packages/feature-flags/src/catalog.ts`: drop `mobile.push_v2`
- `packages/db/seed.ts`: drop `mobile.push_v2` flag row
- `packages/db/prisma/schema.prisma`: ADD deprecation comments to PushToken + NotificationPreference push fields (NO drop)

## Edit — apps/api
- `bullmq/bullmq.module.ts`: drop QUEUE_PUSH import + registerQueue entry
- `jobs/jobs.module.ts`: drop PushProcessor import+provider + QUEUE_PUSH registration
- `notifications/notifications.controller.ts`: delete POST/DELETE push-tokens routes + RegisterPushToken imports
- `notifications/notifications.service.ts`: delete register/unregisterPushToken + RegisterPushTokenDto import (keep prefs; keep DEFAULT_PREFERENCE push fields — columns retained)
- `notifications/notification-dispatcher.service.ts`: drop push branch, allowPush, QUEUE_PUSH inject, JOB_PUSH/QUEUE_PUSH imports, `channels.push` checks
- `notifications/notifications.module.ts`: drop QUEUE_PUSH
- `notifications/notification-matrix.ts`: remove `push` from ChannelSet + all entries (update spec if needed — spec doesn't assert push)
- `referrals/referrals.module.ts` + `referrals.service.ts`: drop push-queue inject + JOB_PUSH_LOYALTY adds (keep loyalty grant + analytics)
- `scheduler/scheduler.module.ts` + `scheduler.service.ts`: drop push-token-cleanup repeatable + QUEUE_PUSH inject. Service has no other jobs → keep as inert bootstrap shell (logs "registered"); preserves DISABLE_SCHEDULERS contract.
- `account-deletion/account-deletion.service.ts`: LEAVE `tx.pushToken.deleteMany` (model kept)
- `config/env.ts`: drop `APP_DEEP_LINK_SCHEME` (only consumer = push.processor/mobile)
- `apps/api/package.json`: drop `expo-server-sdk`
- `apps/api/test/notifications.e2e-spec.ts`: drop the push-token register/unregister test (keep prefs test)

## Edit — root / deploy / config
- `turbo.json`: drop `APP_DEEP_LINK_SCHEME`, `EXPO_PUBLIC_API_URL` from globalEnv; drop `.expo/**` from build outputs
- `deploy/.env.example.prod`: drop `APP_DEEP_LINK_SCHEME`
- `deploy/docker-compose.prod.yml`: drop `APP_DEEP_LINK_SCHEME` api env line
- `tooling/tsconfig/package.json`: drop `react-native.json` from files
- `tooling/tsconfig/base.json`: drop `.expo` from exclude
- `tooling/biome-config/biome.json`: drop `**/.expo` from ignore
- `.dockerignore` / `.gitignore`: drop `.expo`, `.expo-shared`, `*.mobileprovision` mobile lines

## Intentionally LEFT (with reason)
- Prisma PushToken model + NotificationPreference.orderUpdatesPush/promotionsPush + types DTO push fields + DEFAULT_PREFERENCE — retained per core rule (drop deferred to later migration after prod count check).
- `account-deletion` README "PushToken | delete" line + service deleteMany — still accurate (tokens still cleaned).
- Docs (CLAUDE.md, AGENTS.md, docs/**, .claude reports/plans) mentioning mobile/expo — historical; doc rewrite is Slice 11 (plan §16). Acceptance allows "clearly-historical comments."

## Verify
- rg acceptance (excl node_modules, pnpm-lock, migrations, docs/historical)
- typecheck: @repo/jobs, @repo/types, @repo/utils, @repo/api-client, @repo/db generate → @repo/api, @repo/web, @repo/admin
- test: @repo/utils, @repo/api (unit, not e2e)
- Note for orchestrator: run `pnpm install` (lockfile), write column-drop migration after owner prod PushToken count.
