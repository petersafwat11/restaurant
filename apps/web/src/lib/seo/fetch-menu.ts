import {
  type MenuItemDetailDto,
  MenuItemDetailSchema,
  type MenuTreeDto,
  MenuTreeSchema,
} from '@repo/types';
import { connection } from 'next/server';

/** Revalidation window for the server-rendered menu (prices, availability). */
export const MENU_REVALIDATE_SECONDS = 300;

/**
 * API base URL for server-side fetches. Calling `connection()` opts the route
 * into request-time rendering: otherwise pages would be prerendered at build
 * time — when the API is usually unreachable — and ship without the menu /
 * NAP data crawlers need. The fetches themselves stay cached in the Next data
 * cache (`revalidate` + tags), so this adds no API load per request.
 */
export async function apiBase(): Promise<string | null> {
  await connection();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  return apiUrl ? apiUrl.replace(/\/+$/, '') : null;
}

/** Full menu tree for `locale`. Returns `null` (never throws) on API failure. */
export async function fetchMenuTree(locale: string): Promise<MenuTreeDto | null> {
  const base = await apiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/menu?locale=${encodeURIComponent(locale)}`, {
      next: { revalidate: MENU_REVALIDATE_SECONDS, tags: ['menu', `menu:${locale}`] },
      headers: { 'X-App-Audience': 'web' },
    });
    if (!res.ok) return null;
    const parsed = MenuTreeSchema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Thrown when the API itself failed — distinct from a genuine 404. */
export class MenuUnavailableError extends Error {
  constructor(message = 'Menu API unavailable') {
    super(message);
    this.name = 'MenuUnavailableError';
  }
}

/**
 * Menu tree for dish / category pages. Unlike `fetchMenuTree` this THROWS on
 * API failure so Next renders a (retryable) error instead of a 404 — a
 * crawler must never see "not found" for a real dish because the API blipped.
 */
export async function fetchMenuTreeOrThrow(locale: string): Promise<MenuTreeDto> {
  const tree = await fetchMenuTree(locale);
  if (!tree) throw new MenuUnavailableError();
  return tree;
}

export type MenuItemResult = { status: 'ok'; item: MenuItemDetailDto } | { status: 'not-found' };

/** Single dish via `GET menu/categories/:category/items/:item`; throws on API failure. */
export async function fetchMenuItem(
  categorySlug: string,
  itemSlug: string,
  locale: string,
): Promise<MenuItemResult> {
  const base = await apiBase();
  if (!base) throw new MenuUnavailableError('NEXT_PUBLIC_API_URL is not set');
  const url = `${base}/menu/categories/${encodeURIComponent(categorySlug)}/items/${encodeURIComponent(
    itemSlug,
  )}?locale=${encodeURIComponent(locale)}`;
  const res = await fetch(url, {
    next: { revalidate: MENU_REVALIDATE_SECONDS, tags: ['menu', `menu:${locale}`] },
    headers: { 'X-App-Audience': 'web' },
  });
  if (res.status === 404) return { status: 'not-found' };
  if (!res.ok) throw new MenuUnavailableError(`Menu item request failed (${res.status})`);
  const parsed = MenuItemDetailSchema.safeParse(await res.json());
  if (!parsed.success) throw new MenuUnavailableError('Unexpected menu item payload');
  return { status: 'ok', item: parsed.data };
}
