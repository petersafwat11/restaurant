# Fix production admin PWA installation and alerts

## Goal

Make the deployed Android admin dashboard installable and enable closed-app new-order Web Push
alerts without exposing the private signing key.

## Plan

1. Fix the admin production image so `apps/admin/public` is copied into the Next.js standalone
   runtime. This restores `/sw.js`, PWA icons, and other public assets required by Android.
2. Harden deployment checks: fail the admin image build when its public VAPID key is absent, and
   extend the production smoke test to verify the manifest, service worker, and required icons.
3. Generate one stable VAPID key pair. Store the public and private keys as masked GitHub secrets;
   pass only the public key into the admin build, and securely upsert both keys into the VPS `.env`
   during deployment so the API can sign Web Push messages.
4. Add or update focused contract tests and documentation, then run lint, typecheck, tests, and a
   production/Docker build check.
5. Commit, merge, and push to `main`; monitor build and deployment workflows; verify the live PWA
   endpoints and Android-install prerequisites after deployment.

## Expected result

- Android Chrome offers **Install app** / **Add to Home screen**, and the in-dashboard install
  control opens the native installation prompt when Chrome exposes it.
- **Enable alerts** becomes active. After permission is granted, the device registers for Web Push.
- New-order notifications can arrive while the installed dashboard is closed.
- Future deployments fail visibly instead of silently shipping without PWA assets or VAPID config.
