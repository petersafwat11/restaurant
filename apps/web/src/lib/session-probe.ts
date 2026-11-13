/**
 * Cheap "is anyone signed in?" check for the app shell.
 *
 * The typed API client validates with Zod, and loading it is the most
 * expensive JS on a cold page — yet most visitors are anonymous, for whom
 * `/auth/me` is a 401. This probe asks the same endpoint with a bare `fetch`
 * (same base URL, credentials and audience header as the client); only when it
 * answers 200 do callers load the real client to fetch and validate the
 * profile. Anonymous visitors therefore never download the client on pages
 * that don't otherwise need it.
 */
export async function hasActiveSession(): Promise<boolean> {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '');
  if (!base) return false;
  try {
    const res = await fetch(`${base}/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'X-App-Audience': 'web' },
    });
    return res.ok;
  } catch {
    return false;
  }
}
