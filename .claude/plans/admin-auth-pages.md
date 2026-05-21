# Admin Auth Pages — Visuals + Integration Plan

## 1. Current state (audited)

All five auth route files exist under `apps/admin/src/app/(auth)/` but each is a
4-line stub returning `null`:

- `login/page.tsx`
- `register/page.tsx`
- `forgot-password/page.tsx`
- `reset-password/page.tsx`
- `verify-email/page.tsx`

There is **no** `(auth)/layout.tsx`, so the auth screens currently fall through
to the bare root layout with no chrome.

Everything *behind* the UI is already wired:

- **Hooks** in `apps/admin/src/features/auth/hooks/`:
  `useLogin`, `useRegister`, `useForgotPassword`, `useResetPassword`,
  `useVerifyEmail`, `useRequestOtp`, `useVerifyOtp`. Each calls
  `getApiClient().auth.*`, fires `notify(...)` toasts, and (for login/register)
  pushes the session into `useAuthStore` which posts the refresh token to
  `/api/auth/set-session` (httpOnly cookie).
- **Zod schemas** in `@repo/types/auth.ts`:
  `LoginSchema`, `RegisterSchema`, `ForgotPasswordSchema`, `ResetPasswordSchema`,
  `VerifyEmailSchema`, plus shared `EmailSchema` / `PasswordSchema` / `PhoneSchema`.
- **Backend** in `apps/api/src/auth/auth.controller.ts`: `POST register`,
  `login`, `refresh`, `logout`, `request-otp`, `verify-otp`, `forgot-password`,
  `reset-password`, `verify-email`, `GET me`. All `@Public()` for the public ones.
- **Dashboard layout** redirects unauthenticated users to `/login` once the
  auth store hydrates (`(dashboard)/layout.tsx:55`).

Design assets folder `design-assets/admin/` contains only `.gitkeep` — there
is no Figma/preview reference for auth. So we design from the locked token set
in `docs/design-prompts/README.md §4` and the admin shell idioms already in
use (sidebar/topbar/cards). The dashboard convention is "dark mint": near-black
`bg`, slightly lifted `surface`, mint `accent`, semantic state colors, dense
14px body, tabular numerals.

## 2. Visual design

### 2.1 Shared shell (`(auth)/layout.tsx`)

Single, focused layout for all five auth pages. No sidebar/topbar.

**Composition**
- Full-viewport flex container, `bg-bg` (#0B0D12).
- Two-column at `lg:` and up, single-column below.
- **Left pane (`lg:w-1/2`, hidden below `lg`)** — a quiet "brand" panel:
  - `bg-surface` with a soft radial mint glow in the top-left
    (`bg-[radial-gradient(at_top_left,rgb(var(--accent)/0.12),transparent_60%)]`).
  - Wordmark "Restaurant **Admin**" in 28px, weight 600, `text-fg`; the second
    word in `text-accent`.
  - Beneath it: a 3-line value blurb in `text-fg-muted`, max-width 38ch.
  - A subtle decorative element at the bottom — a 1px `border-border/30` plate
    holding three "metric chips" mocked in CSS only (e.g. "Orders today · 142",
    "Live · 7", "Avg prep · 18m") to communicate this is the operator console.
    Static; no data fetching from this layout.
- **Right pane** — vertically centered card:
  - Max width `420px`, padding `p-8`.
  - `bg-surface-2` (#1A1E27), `border border-border/60` with the white-alpha
    convention, `rounded-card` (12px), `shadow-card`.
  - Card header: page-specific title (`h1-admin` typography) + 1-line
    `text-fg-muted` helper.
  - Card body: the form.
  - Card footer: secondary links (e.g. "Forgot password?", "Create account").

**Above the card on mobile only**: a compact wordmark to compensate for the
hidden left pane.

### 2.2 Form primitives (no new package work)

Reuse what's already in `packages/ui`:

- `FormField` (`packages/ui/src/form-field/`) — handles label, required mark,
  helper/error text, `aria-describedby` wiring.
- `Input` from `packages/ui/src/_shadcn/input.tsx` for text/email/password.
- `Button` from `_shadcn/button.tsx` for the primary CTA.
- `Checkbox` from `_shadcn/checkbox.tsx` for "Remember me".
- `Label` (already used inside `FormField`).

No new generic components are needed. Three small page-local helpers — kept in
the page files, not extracted unless reused later:

- `PasswordInput` — wraps `Input` with a show/hide eye button (lucide
  `Eye`/`EyeOff`), nothing fancy.
- `PasswordStrengthMeter` — 4-segment bar driven by the rules already encoded
  in `PasswordSchema` (length 8+, upper, lower, digit). Used on register +
  reset-password only.
- `AuthFormShell` — a thin component for "title + helper + form + footer
  links". Keeps each page slim. Lives at `apps/admin/src/features/auth/components/auth-form-shell.tsx`.

### 2.3 Color usage rules (so the screens feel like the dashboard)

- Card background: `bg-surface-2`. Page background: `bg-bg`.
- Input idle: `bg-surface`, `border-border/60`. Focus ring: `accent` at 40%
  alpha (`focus-visible:ring-accent/40 focus-visible:border-accent`).
- Primary button: `bg-accent text-text-on-accent`, `hover:bg-accent-hover`,
  `disabled:opacity-50`. Use the existing `Button` `default` variant if it
  already maps this way; otherwise pass classes.
- Inline error text: `text-negative text-small-admin`.
- Inline success/info banner (e.g. "Check your email"): `bg-accent/10 border
  border-accent/30 text-fg` with an info icon.
- Links: `text-accent hover:text-accent-hover underline-offset-4
  hover:underline`.

### 2.4 Per-page layout

**Login (`/login`)**
- Title: "Sign in", helper: "Use your staff credentials".
- Fields: email, password (with show/hide). Below the password row: checkbox
  "Remember me" on the left, link "Forgot password?" on the right.
- Primary CTA: "Sign in" full-width.
- Footer link: "Need an account? **Request access**" → `/register` (only shown
  if `NEXT_PUBLIC_ALLOW_ADMIN_SIGNUP` is `'true'`; otherwise hidden, because
  admin accounts are normally provisioned by an owner).
- On success: redirect to `/` (root → dashboard).

**Register (`/register`)**
- Title: "Create your account", helper: "You can be invited later — this is
  for the first owner setup".
- Fields: firstName + lastName side-by-side (`grid-cols-2 gap-3`), email,
  phone (optional), password with strength meter, referralCode (collapsed
  behind a "Have a referral code?" toggle).
- Primary CTA: "Create account".
- Footer link: "Already have an account? **Sign in**".
- On success: redirect to `/verify-email?email=<email>` (the hook already
  toasts "check your email").

**Forgot password (`/forgot-password`)**
- Title: "Reset your password".
- Field: email only.
- Primary CTA: "Send reset link".
- On success: replace the form with a quiet confirmation panel — accent-tinted
  card region with: "If an account exists for that email, we sent a reset
  link." plus a "Back to sign in" link. We don't reveal account existence
  (mirrors the hook's toast message).

**Reset password (`/reset-password?token=...`)**
- Title: "Choose a new password".
- Token read from `useSearchParams()`. If missing, render a `text-negative`
  panel: "This link is invalid or has expired." with a "Request a new link"
  button → `/forgot-password`.
- Fields: password (with strength meter) + confirmPassword. Form-level error
  if the two don't match (validated client-side with a `superRefine`).
- Primary CTA: "Update password".
- On success: redirect to `/login` (the hook already shows the success toast).

**Verify email (`/verify-email?token=...`)**
- Two modes:
  - **Token mode** (`?token=...` present): show a single centered status block.
    On mount, fire `useVerifyEmail().mutate({ token })`. Display three states:
    - `pending` — `Loader2` spin (lucide) + "Verifying your email…"
    - `success` — `CheckCircle2` in `text-positive` + "Email verified" + a
      `Button` "Continue to dashboard" → `/`.
    - `error` — `AlertCircle` in `text-negative` + the error message + button
      "Back to sign in" → `/login`.
  - **No-token mode** (entry via redirect after register): show "We sent a
    verification link to **{email}**. Click it to activate your account.
    Didn't get it? **Resend**" — `Resend` calls `useForgotPassword`-style
    endpoint **only if** an explicit resend endpoint exists; otherwise the
    button shows a tooltip "Available soon" and is disabled. (Audit: there is
    no `auth/resend-verification` route in `auth.controller.ts`, so we'll
    ship this button disabled with a comment and leave a TODO. Adding the
    endpoint is out of scope for this plan.)

## 3. Integration

### 3.1 React Hook Form + Zod

Each page uses `useForm({ resolver: zodResolver(<Schema>) })`. Forms submit
their typed DTO directly to the matching hook's `.mutate(...)`.

```ts
// login example shape
const form = useForm<LoginDto>({ resolver: zodResolver(LoginSchema), defaultValues: { email: '', password: '' } });
const login = useLogin();
const onSubmit = (values: LoginDto) => login.mutate(values);
```

The `RegisterSchema` already has `referralCode` optional; just unset it when
the collapsed input is empty (`undefined`, not `''`) so Zod's regex doesn't
trip.

For reset-password we extend `ResetPasswordSchema` locally with a
`confirmPassword` field + `superRefine` for match — but submit only the
schema's own keys to the hook.

### 3.2 Hooks → API → Session

Already done; nothing to change in the hook layer:

- `useLogin` / `useRegister` → call `auth.login`/`auth.register` → on success
  call `useAuthStore.setSession({...})` which (a) sets in-memory state, (b)
  posts the refresh token to `/api/auth/set-session` for an httpOnly cookie.
- `useForgotPassword` / `useResetPassword` / `useVerifyEmail` → fire the
  matching endpoint and surface toasts via `notify(...)`.

### 3.3 Redirects

- Login success: `router.replace('/')` (dashboard root). Honor an optional
  `?next=/some/path` query param so deep links survive the auth bounce. Use
  a small sanitizer that only accepts paths starting with `/` and **not**
  starting with `//` (defends against open-redirect via `//evil.com`).
- Register success: `router.replace(`/verify-email?email=${encoded}`)`.
- Reset-password success: `router.replace('/login')`.
- Verify-email success: `router.replace('/')`.

**Bonus auth-side redirect (mirrors the dashboard auth gate)**: the
`(auth)/layout.tsx` reads `useAuthStore` — if `isHydrated && user` it
redirects to `/` (or `?next` if provided). This prevents a signed-in admin
from seeing the login screen if they hit `/login` directly.

### 3.4 Error surfacing

Two layers, no surprises:

1. **Field-level**: Zod validation errors flow through RHF and render via
   `FormField`'s `error` prop. The DTO `PasswordSchema` already produces
   readable messages.
2. **Form-level**: mutation errors are toasted by the hook (`notify('error',
   err.message)`). Also render a compact inline error banner above the
   submit button on `isError` so users see it without relying on the toast
   (toasts are easy to miss on a focused form). Banner: `bg-negative/10
   border border-negative/30 text-negative`, contains `error.message`.

For the 401 case on `/login`, the API surfaces a generic "Invalid credentials"
message — keep it as-is, no leakage.

### 3.5 Loading + disabled states

- `Button` gets `disabled={mutation.isPending || !form.formState.isValid}`
  and renders an inline spinner when pending.
- Whole form gets `<fieldset disabled={mutation.isPending}>` so nothing else
  can be edited mid-submit.

### 3.6 Accessibility

- Each page sets `<h1>` via the form-shell title (visually styled
  `h1-admin`).
- Inputs are auto-`id`'d by `FormField`. `aria-invalid` toggled from
  `formState.errors`.
- Primary button is the form's submit; pressing Enter anywhere in the form
  submits. Tab order: top to bottom, footer links last.
- Password show/hide button has `aria-label` toggling between "Show
  password" / "Hide password".

## 4. Files to create / change

```
apps/admin/src/app/(auth)/
  layout.tsx                              (new) — shell described in §2.1
  login/page.tsx                          (rewrite)
  register/page.tsx                       (rewrite)
  forgot-password/page.tsx                (rewrite)
  reset-password/page.tsx                 (rewrite)
  verify-email/page.tsx                   (rewrite)

apps/admin/src/features/auth/components/
  auth-form-shell.tsx                     (new) — title/helper/footer wrapper
  password-input.tsx                      (new) — input + eye toggle
  password-strength-meter.tsx             (new) — 4-segment bar
  index.ts                                (update — re-export the three above)

apps/admin/src/lib/
  safe-next.ts                            (new) — parses `?next=` safely; 10 lines
```

No changes to:
- `packages/ui/*` — primitives already cover this.
- `packages/types/*` — schemas already exist.
- `apps/admin/src/features/auth/hooks/*` — already complete.
- `apps/api/*` — backend already complete.
- `tooling/tailwind-config/*` — tokens already cover everything we need.

## 5. Build order

1. `safe-next.ts` helper.
2. `(auth)/layout.tsx` + the three small `features/auth/components/*`. Verify
   visually with a placeholder page body before touching the form pages.
3. `login/page.tsx` end-to-end (RHF + hook + redirect). Manual test: bad
   creds → inline + toast error; good creds → land on `/`; `?next=/orders` →
   land on `/orders`; already-signed-in → bounced off `/login`.
4. `register/page.tsx`. Manual test: weak password shows strength meter and
   field errors before submit; success redirects to verify-email.
5. `forgot-password/page.tsx`. Manual test: submit → confirmation panel.
6. `reset-password/page.tsx`. Manual test: no token → error panel; mismatched
   confirm → form error; success → redirect to `/login`.
7. `verify-email/page.tsx`. Manual test: with valid token → success state +
   continue; with bad token → error state.
8. Quick a11y sweep: tab order, focus rings visible, `aria-invalid` set on
   errored fields, Enter submits.

## 6. Test plan

- **Type check + lint**: `pnpm --filter @repo/admin typecheck`,
  `pnpm --filter @repo/admin lint`.
- **Unit (light)**: one Vitest spec per page exercising the happy path with
  the hook mocked, plus a guard test for the open-redirect sanitizer in
  `safe-next.ts`. (Tests are nice-to-have here, not blocking — the hooks
  themselves already have tests in `features/auth/hooks/__tests__/`.)
- **Manual E2E**: run `pnpm --filter @repo/api dev` and
  `pnpm --filter @repo/admin dev`, then walk all five flows against the real
  backend.
- **Visual**: each page rendered on viewports 360 / 768 / 1280 / 1440. Left
  brand pane disappears below `lg`; card stays centered and reads cleanly.

## 7. Out of scope

- `request-otp` / `verify-otp` flows (no admin route surface for phone-based
  login today).
- `resend-verification` endpoint (doesn't exist server-side; flagged in §2.4).
- Social/SSO logins.
- Multi-tenant / restaurant-picker on login — admin auth is already
  single-tenant from the user's perspective; tenant context comes from
  `useMe()`.
- Adding new tokens to `tailwind-config` — none needed; the locked admin
  palette covers everything described above.

---

**Approval needed before I start implementing.** If you want the left brand
panel removed (single-column everywhere), or a different copy for the value
blurb, say so now — those are the two visual calls most likely to be a matter
of taste.
