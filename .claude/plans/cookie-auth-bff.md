# Plan: Move auth tokens to httpOnly cookies (API-sets-cookies, end-to-end)

## Problem

Today the access token lives in memory only (Zustand, no `persist`). Each new tab starts blank and must run the refresh dance on mount to recover. The refresh token is single-use (`apps/api/src/auth/auth.service.ts:153`), so any concurrent or duplicate refresh kicks the user out. Additionally, on localhost the web and admin apps share the same `refresh_token` cookie (cookies don't scope by port), so logging into one clobbers the other.

## Goal

Both access and refresh tokens live in httpOnly cookies, set by the NestJS API itself. The browser carries them automatically on every request, including WebSocket handshakes. New tabs work immediately. Multiple tabs never race for refresh tokens. Web and admin sessions are independent even on localhost. No JS-readable tokens anywhere — not even briefly.

## Approach: API sets cookies directly, audience-scoped names, no BFF proxy

The NestJS API becomes the sole authority on auth cookies. Both web and admin call the API directly (as they do today). The API:

- Sets `web_at` + `web_rt` cookies when called from the web app.
- Sets `admin_at` + `admin_rt` cookies when called from the admin app.
- Differentiates audience via an `X-App-Audience: web|admin` header that every client sends.
- The guard reads the audience header, then reads the matching cookie. Falls back to `Authorization: Bearer` for mobile (which has no cookies).

Cookies are httpOnly, SameSite=Lax, scoped to the API origin. Browsers carry them on every credentialed HTTP request AND on the Socket.IO WebSocket handshake (same connection upgrade flow). No BFF, no proxy route, no client-side refresh dance, no Next route handlers for session management.

### Why this design satisfies the "perfect" bar

| Requirement | How it's met |
|---|---|
| No JS-readable tokens, ever | All tokens are httpOnly cookies set by the API in `Set-Cookie`. Login response body returns only `{ user }`. Never any token in JS. |
| New tabs work instantly | Browser sends cookies on the first request automatically. `/auth/me` succeeds without any refresh dance. |
| No concurrent-refresh races | Refresh happens server-side inside the API request that returned 401 (the API mints a new pair on every authenticated request close to expiry — see "Sliding refresh" below). The single-use revoke check stays, but the race window collapses to a single request. |
| Web vs admin isolated on localhost | Distinct cookie names per audience. Localhost port collision is irrelevant — `admin_at` and `web_at` simply don't overlap. |
| WebSocket auth works with cookies | Socket.IO client uses `withCredentials: true`. Browser sends cookies on the handshake. Server adapter reads the same audience-cookie in `io.use()` middleware. No ticket endpoint, no token in JS. |
| Login intercepted server-side | Login response sets cookies directly via `Set-Cookie` headers. No `/api/auth/set-session` round-trip from the client. |
| Mobile unaffected | Mobile sends `Authorization: Bearer` (existing path). Guard prefers cookie when present, falls back to header. |

### Why not the original BFF proxy plan

The BFF plan had the Next app forward every API call so it could read/write its own per-app cookies. That works but has costs:

- Every API call hops through Node twice (browser → Next → API). Adds latency and memory pressure in serverless deployments.
- File downloads and SSE streams need careful piping.
- Socket.IO can't proxy through Next's App Router without a custom server.
- Login still needs an explicit hop.

API-sets-cookies eliminates all four costs. The audience-header trick gives us per-app isolation without proxying anything.

## Sliding refresh (eliminates client-side refresh entirely)

To remove the client's role in refresh, the API performs **sliding token refresh server-side**:

- On any authenticated request, if the access token's remaining lifetime is below a threshold (e.g., `< 5 min`), the auth interceptor mints a new pair and writes new `Set-Cookie` headers on the response.
- The refresh token's revoke-and-rotate behavior stays exactly as today (`auth.service.ts:153-163`).
- On hard 401 (token expired before sliding kicked in, or token invalid), the API runs the refresh inline if `<aud>_rt` is present: verify, rotate, mint, retry the original handler, set new cookies. If refresh fails, return 401 and clear cookies via `Set-Cookie` with `Max-Age=0`.

Result: the client never explicitly refreshes. It just makes requests, and the API quietly keeps the session alive. The single-flight, in-flight-promise, cross-tab coordination problems all disappear because they only existed to paper over a client-driven refresh.

## Files to change

### `apps/api`

#### `src/common/guards/jwt-auth.guard.ts`
- After current `Authorization` check, fall back to cookie:
  - Read `X-App-Audience` header. If missing, reject.
  - Read cookie `${audience}_at`.
  - Verify with `verifyAccessToken`. On success, set `req.user`.
- Sliding refresh: after successful verify, check `exp - now < REFRESH_THRESHOLD`. If so, attach a `req.requiresRefresh = true` flag.
- The hard-401 path is handled by a Nest exception filter (below), not the guard.

#### NEW `src/common/interceptors/sliding-refresh.interceptor.ts`
- Runs after the guard.
- If `req.requiresRefresh`, read `${audience}_rt` from cookies, mint a new pair via `AuthService.refresh()`, attach new `Set-Cookie` headers on the outgoing response.
- Wrapped in `try/catch` — if refresh fails here, just don't refresh (current request still succeeds with the still-valid AT). Don't break the user's request just because sliding refresh failed.

#### NEW `src/common/filters/expired-token.filter.ts`
- Catches `UnauthorizedException` thrown by the guard.
- If the exception is "expired" and `${audience}_rt` is present:
  - Try to mint a new pair via `AuthService.refresh()`.
  - On success: re-dispatch the original handler with the new `req.user`, then set new cookies on the response. Implement re-dispatch by calling the controller handler via Nest's `ContextIdFactory` + `ModuleRef`, OR — simpler — by performing this logic inside a custom guard wrapper that returns the response itself.
  - On failure: clear cookies (`Set-Cookie` with `Max-Age=0`), return 401.
- If `${audience}_rt` is absent: clear cookies, return 401.

(Alternative implementation that's simpler than re-dispatch: do the refresh check at the *start* of the guard before verifying the AT — if the AT is expired but the RT is valid, rotate both inline, then continue with the new claims. This avoids re-dispatching the handler. **Decision: go with this. Simpler, single place, no Nest internals tricks.**)

So the guard becomes:

1. If `Authorization: Bearer` present → verify, accept (mobile path).
2. Else read audience from `X-App-Audience`.
3. Read `${audience}_at`. Verify.
   - If valid and not near expiry → accept.
   - If valid and near expiry → accept, mark for sliding refresh (interceptor mints new pair).
   - If expired or invalid → fall through to RT path.
4. Read `${audience}_rt`. Verify, revoke-rotate, mint new pair. Set `req.user` from new AT claims. Attach `req._newTokens` for interceptor to set cookies.
5. If no RT or RT invalid → throw `UnauthorizedException`. Filter clears cookies.

Single place, no re-dispatch.

#### `src/auth/auth.controller.ts`
- `/auth/login`, `/auth/register`, `/auth/verify-otp`: after `service.login/register/verifyOtp`, set `${audience}_at` and `${audience}_rt` cookies on the Fastify reply, return `{ user }` only (no tokens in body).
- `/auth/logout`: revoke RT (existing), clear both cookies via `Max-Age=0`.
- `/auth/refresh`: kept for mobile, returns tokens in body as today. Web/admin never call this (the guard handles it transparently).

#### `src/auth/auth.module.ts` and `src/app.module.ts`
- Register `SlidingRefreshInterceptor` globally (after auth guard).
- Register `ExpiredTokenFilter` globally (handles `UnauthorizedException` → cookie clear).

#### `src/main.ts`
- Verify `app.enableCors({ credentials: true, origin: [web, admin] })` already in place (it is — line 48-51).
- Add `@fastify/cookie` to the Fastify instance: `await app.register(fastifyCookie)`.

#### `src/realtime/realtime.gateway.ts` (or wherever the socket adapter is wired)
- Add Socket.IO server middleware (`io.use((socket, next) => { ... })`) that reads `socket.handshake.headers.cookie`, parses, reads `${audience}_at` (audience from a query param or header on the handshake), verifies, attaches user to `socket.data.user`. Pass-through on success, reject on failure.
- Socket.IO server CORS must allow credentials and the app origins.

### `apps/admin` and `apps/web` — mirrored, slimmer than original plan

#### `src/lib/api-client.ts`
- Drop `getAccessToken`, `refreshAccessToken`, `onUnauthorized` plumbing — none of it is needed.
- Add a header injector: every request includes `X-App-Audience: admin` (or `web`).
- Keep `credentials: 'include'` (already set in `@repo/api-client`).
- On a final 401 (means session is dead), call `useAuthStore.getState().clearSession()` to wipe in-memory user state and redirect to /login.

#### `src/stores/auth-store.ts`
- Drop `accessToken` field entirely.
- Drop `setAccessToken`.
- `setSession({ user })` → just `set({ user })`. No more refresh-token plumbing.
- `clearSession()` → POST `/auth/logout` directly to API (browser carries the cookie), then `set({ user: null })`. The API clears cookies via response.
- Keep `user`, `isHydrated`, `hasPermission`, `markHydrated`.

#### `src/features/auth/hooks/use-login.ts` (and use-register, use-verify-otp)
- Mutation calls `apiClient.auth.login(input)`. API response now is `{ user }` only.
- On success: `setSession({ user })`. Cookies were already set by the API in the response.

#### `src/providers/app-providers.tsx`
- On mount, call `auth.me()`. Browser carries cookies automatically. If it returns 200 → `setUser`. If 401 → leave `user: null`. Then `markHydrated`. Same as today, but the cookie-carrying makes it always succeed when the user is logged in.

#### `src/lib/realtime-client.ts`
- Drop `getAccessToken` from the connect options.
- Add `withCredentials: true` to the Socket.IO client.
- Pass `query: { audience: 'admin' }` (or `'web'`) so the server middleware knows which cookie to read.
- No token plumbing.

#### DELETED: `src/app/api/auth/set-session/route.ts`
#### DELETED: `src/app/api/auth/clear-session/route.ts`
#### DELETED: `src/app/api/auth/get-refresh-token/route.ts`

All three obsolete — the API handles cookies directly.

### `@repo/api-client`

#### `packages/api-client/src/client.ts`
- Accept a new option `audience?: 'web' | 'admin' | 'mobile'`.
- If `audience` is set, attach `X-App-Audience: <audience>` to every request.
- Remove the 401-refresh logic (`refreshAccessToken`, `inflightRefresh`, etc.) — the server handles it now. Mobile keeps it because mobile is header-based.
- Actually, **keep** the refresh-on-401 path conditional: if `getAccessToken` is provided (mobile case), keep doing 401-retry-with-refresh as today. If `audience` is provided (cookie case), don't retry — just propagate the 401 to the caller.

#### `packages/api-client/src/index.ts`
- Export the new audience type.

### `apps/mobile` — no changes

Mobile already uses SecureStore + Authorization header path. Sets `audience: 'mobile'` (or just doesn't set audience, since it provides `getAccessToken` and that's what the client uses). Unaffected.

## Cookie attributes

```ts
{
  name: `${audience}_at`,        // e.g. 'admin_at'
  httpOnly: true,
  secure: NODE_ENV === 'production',
  sameSite: 'lax',               // strict CORS + lax cookies is fine
  path: '/',
  maxAge: JWT_ACCESS_TTL_SECONDS,
}
```

`${audience}_rt` is identical but with `JWT_REFRESH_TTL_SECONDS`.

**No `Domain` attribute** → host-only cookies, scoped to the API host. In dev (localhost): cookies are sent to all localhost requests, but since web and admin send distinct `X-App-Audience` headers, the API picks the right cookie. In prod (api.example.com): cookies are only sent to api.example.com — clean.

### Cross-site SameSite caveat (production)

If web/admin and the API are on **fully different registrable domains** (e.g., `myapp.com` and `myapi.io`), `SameSite=Lax` cookies will not be sent on cross-site fetches. The fix is `SameSite=None; Secure`. We'll set SameSite via env: `COOKIE_SAMESITE=lax|none`, default `lax`. Document the requirement.

For the common case where web=`example.com`, admin=`admin.example.com`, api=`api.example.com`: all are same-site (eTLD+1 = `example.com`) → `Lax` works.

## CSRF posture

`SameSite=Lax` blocks cross-site POST/PUT/DELETE from carrying the cookie. Combined with the existing strict CORS (`apps/api/src/main.ts:48-51`) limiting origins to web+admin URLs, that closes the standard CSRF window.

If we move to `SameSite=None; Secure` in production, we lose that layer and need a CSRF token. Add a double-submit cookie pattern: API issues an `<aud>_csrf` non-httpOnly cookie at login. Client reads it via JS and sends it back as `X-CSRF-Token` header on every state-changing request. API verifies the header equals the cookie value. Cheap, robust, idiomatic.

**Decision:** ship Lax-only initially. Add the CSRF double-submit only when/if we deploy with `SameSite=None`. Both code paths land in this change so the switch is config-only later.

## Migration order

1. **API changes first** (no client touches yet) — guard fallback + interceptor + cookie-setting controller. Mobile keeps working (header path unchanged). Web/admin keep working (the existing client still passes Authorization — the API just *also* now sets cookies on login response, harmlessly ignored by clients).
2. **Admin client** — switch to audience header, drop access-token plumbing, delete the three Next route handlers, drop in-memory token, switch realtime to `withCredentials`. Verify across multiple tabs and across both apps simultaneously.
3. **Web client** — mirror of admin.
4. **Cleanup** — remove the `/auth/refresh` path's body return for web/admin (mobile only); remove `refreshAccessToken` plumbing from `@repo/api-client` (kept for mobile).

## Acceptance

- Open dashboard URL in a fresh tab while logged in → renders without redirect, zero refresh roundtrips visible in network tab.
- Have web and admin both logged in on localhost → opening either app's new tab still respects that app's session. Logging out of one doesn't affect the other.
- 50 parallel API calls right after page load do not cause a logout (no client-side refresh to race).
- Long-running tab (token expires mid-session) → next request transparently sliding-refreshes; no UI hiccup, no race.
- Logout from any tab clears cookies via API response; other tabs of the same app hit /me on next request → 401 → routed to /login.
- WebSocket connects via cookies only, no token in JS.
- Mobile auth unchanged.

## Risks / open questions

- **Sliding-refresh + write endpoints with side-effects.** If sliding refresh runs during a POST that mutates state, and the refresh itself fails (rare — RT was revoked elsewhere), the interceptor swallows the refresh failure and the request succeeds. Acceptable. The user's session continues until the AT actually expires.
- **Cookie size in `Set-Cookie` headers.** Two ~700B JWTs in response headers per refresh event. Well under any limit.
- **Socket.IO disconnect on AT expiry.** Long-lived sockets stay open with the user identity from handshake — they don't get re-authed mid-stream. If a user gets revoked while a socket is open, they keep receiving events until disconnect. Mitigation: emit an `auth:expired` event from the server on user revoke and have the client drop the socket. Out of scope for this change.
- **API now has cookie-parsing dependency.** `@fastify/cookie`. Already in the Fastify ecosystem; tiny.
- **Audience header spoofing.** A malicious client could send `X-App-Audience: admin` while logged in as web. The audience header only picks the cookie name; it doesn't grant any extra permissions. Since the customer doesn't have `admin_at` cookie set, the lookup returns nothing → 401. Safe.
