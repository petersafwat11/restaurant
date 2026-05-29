import { MenuApp } from '@/features/menu/components/menu-app';
import { getAlternates } from '@/lib/seo/alternates';
import { fetchPublicRestaurant } from '@/lib/seo/fetch-restaurant';
import { fetchStructuredData } from '@/lib/seo/fetch-structured-data';
import { JsonLd, buildBreadcrumbSchema } from '@/lib/seo/json-ld';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export async function generateMetadata({
  params,
}: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'web.layout.meta' });
  return {
    // The root layout's title template wraps everything with "%s — Brand";
    // pages typed against `web.layout.nav.menu` would be too generic, so we
    // use the namespace's verbatim "menu" nav label as the page title.
    title: 'Menu',
    description: t('description'),
    alternates: getAlternates('/menu'),
  };
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
}

/**
 * Menu page (/menu) — composes the full menu surface.
 *
 * Renders against the active restaurant via `useMenuTree` (client). The
 * server-side wrapper fetches the public restaurant (for the slug) and the
 * full schema.org graph (`Restaurant` + `Menu` + `AggregateRating`) and
 * emits two JSON-LD blocks: the menu graph and a `BreadcrumbList`. Both
 * are cached at the data layer for 1 h.
 */
export default async function MenuPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'web.layout.nav' });

  const restaurant = await fetchPublicRestaurant();
  const structured = restaurant ? await fetchStructuredData(restaurant.slug) : null;
  const base = siteUrl();
  const breadcrumb = buildBreadcrumbSchema([
    { name: t('home'), url: `${base}/` },
    { name: t('menu'), url: `${base}/menu` },
  ]);

  return (
    <>
      {structured ? <JsonLd id="ld-menu" data={structured} /> : null}
      <JsonLd id="ld-breadcrumb-menu" data={breadcrumb} />
      <MenuApp />
    </>
  );
}
