# Plan: Staff account creation, user reset, notification badge, and release

## Outcome

- Android notifications use a recognizable monochrome restaurant badge instead of a white circle.
- Only the owner can create staff accounts directly from the Staff page.
- The owner enters first name, last name, email, phone, password, and role; the account is immediately active and an account-created email is queued.
- Development customer/staff access and operational history are removed from production while menu and restaurant configuration remain intact.
- The currently uncommitted Settings work is reviewed, tested, committed, and deployed with this release.

## Implementation

1. **Notification badge**
   - Derive a transparent 96x96 monochrome badge from the existing restaurant mark.
   - Keep the full-colour icon for the expanded notification and use the new asset only for `badge`.
   - Advance the safe service-worker cache version and extend its contract tests.

2. **Owner-created staff accounts**
   - Replace invite DTOs in active use with a shared Zod `CreateStaffAccountSchema` containing first name, last name, email, phone, password, and a non-owner staff role.
   - Add an owner-only protected API endpoint that checks uniqueness, hashes the password, creates the user and role transactionally, and marks the owner-created email as verified.
   - Queue a BullMQ account-created email after creation. The email contains the admin login URL, account email, and assigned role, but never the plaintext password.
   - Add audit coverage for staff account creation and retain deactivate/reactivate/role-management safeguards.

3. **Staff page workflow**
   - Replace the Invite button/modal/token workflow with a responsive Create account modal built from `@repo/ui` and the shared schema via React Hook Form.
   - Include clear field errors, password visibility, pending/error/success states, and EN/PL translations.
   - Refresh the staff table after success and ensure only the owner sees the creation action.

4. **Production user reset**
   - Add a Prisma-based, explicitly invoked reset script with dry-run support; do not use raw SQL.
   - Take a timestamped PostgreSQL backup before mutation.
   - Preserve restaurant settings, operating hours, menu categories/items/modifiers, tables, roles/permissions, and feature flags.
   - Delete development users/staff, sessions, push subscriptions, orders/payments, reviews, reservations, carts, loyalty/referrals, contact/newsletter data, promotions, audit/analytics rows, and other operational history in dependency-safe order.
   - Create exactly one active owner with the supplied credentials and verify: one user with only the owner role and zero residual operational records.
   - The new owner must sign in and enable push alerts again because old subscriptions are intentionally removed.

5. **Review existing local work**
   - Review the uncommitted Financials/Reservations Settings extraction, validation, i18n, tests, and generated types.
   - Fix only issues found by review/tests and include all verified local changes in the release; do not blindly stage temporary or unrelated artifacts.

6. **Verification and release**
   - Add API happy-path/authorization/duplicate-account e2e tests, staff UI tests, email processor tests, and notification badge contract tests.
   - Run formatting/lint, package typechecks, admin tests, API e2e tests, and production Docker builds.
   - Fix the CI e2e database-name mismatch if it is still present so the pushed commit can pass the repository workflow.
   - Commit on a `codex/` branch, merge into `main`, push, monitor image build/deploy, run the production reset only after backup, and verify live PWA assets, account counts, login, staff creation, email queue health, and deployment smoke tests.

## Approval gates

- Owner account details are required before the reset: first name, last name, email, phone, and password.
- Literal deletion of development orders, reviews, reservations, users/staff, and related business history was explicitly approved on 2026-08-11; the workflow still takes a production backup first.
- Plaintext passwords will not be sent by email. If password delivery by email is explicitly required, stop and re-confirm the security tradeoff before changing this plan.
