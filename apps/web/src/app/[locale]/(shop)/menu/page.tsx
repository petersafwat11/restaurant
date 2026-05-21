import type { Metadata } from 'next';
import { MenuApp } from '@/features/menu/components/menu-app';
import { getAlternates } from '@/lib/seo/alternates';

export function generateMetadata(): Metadata {
  return { alternates: getAlternates('/menu') };
}

/**
 * Menu page (/menu) — composes the full menu surface.
 *
 * Renders against the seeded restaurant ("The Test Kitchen") via
 * `useMenuTree`. When a real Szef Donald restaurant is onboarded, swap the
 * default slug to that restaurant's id (or resolve it from the host header /
 * a location selector).
 */
export default function MenuPage() {
  return <MenuApp />;
}
