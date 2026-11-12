import { ServerDataHydration } from '@/components/server-data-hydration';
import { MenuApp } from '@/features/menu/components/menu-app';
import { OrderDirectBanner } from '@/features/seo/components/seo-blocks';
import { seoH1, seoMetadata } from '@/features/seo/load-seo';
import { buildSeoVars, interpolate } from '@/features/seo/seo-vars';
import { fetchMenuTree } from '@/lib/seo/fetch-menu';
import { fetchPublicRestaurant } from '@/lib/seo/fetch-restaurant';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildBreadcrumbNode, buildMenuNode } from '@/lib/seo/schema';
import { Container } from '@repo/ui';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return seoMetadata(locale, 'menu', '/menu');
}

/**
 * Menu page (/menu). The H1, intro and full menu are server-rendered: the
 * menu tree is fetched here (cached 300 s, tag `menu`) and seeded into the
 * client query cache, so crawlers see every category (H2) and dish (H3) with
 * price, weight and photo. Search / filters / cart stay client-side.
 */
export default async function MenuPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [tree, restaurant] = await Promise.all([fetchMenuTree(locale), fetchPublicRestaurant()]);
  const vars = restaurant ? buildSeoVars(restaurant, locale) : null;
  const t = await getTranslations({ locale, namespace: 'web.shop.menu' });
  const tSeo = await getTranslations({ locale, namespace: 'web.seo.pages.common' });
  const h1 = await seoH1(locale, 'menu', vars);
  const allItems = tree?.categories.flatMap((c) => c.items) ?? [];

  return (
    <>
      {tree ? (
        <JsonLd
          id="ld-menu"
          data={[
            buildMenuNode(tree, locale, h1),
            buildBreadcrumbNode(
              [
                { name: tSeo('breadcrumbHome'), href: '/' },
                { name: tSeo('breadcrumbMenu'), href: '/menu' },
              ],
              locale,
            ),
          ]}
        />
      ) : null}
      <Container className="pb-12 pt-16">
        <span className="text-eyebrow uppercase text-accent">{t('eyebrow')}</span>
        <h1
          className="mt-4 font-display text-h2 text-fg sm:text-h1"
          style={{ textWrap: 'balance' }}
        >
          {h1}
        </h1>
        {tree && (
          <p className="mt-4 max-w-[640px] text-body-l text-fg-muted">
            {t('heroSummary', {
              dishCount: allItems.length,
              categoryCount: tree.categories.length,
            })}
          </p>
        )}
        {vars && (
          <OrderDirectBanner
            text={interpolate(tSeo.raw('orderDirect') as string, vars)}
            href="/dostawa"
          />
        )}
      </Container>
      <ServerDataHydration menu={{ locale, tree }}>
        <MenuApp />
      </ServerDataHydration>
    </>
  );
}
