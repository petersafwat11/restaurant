import { type DishPicker, SeoLandingPage } from '@/features/seo/components/seo-landing-page';
import { seoMetadata } from '@/features/seo/load-seo';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return seoMetadata(locale, 'kebabKielce', '/kebab-kielce');
}

/** Featured dishes first, then the rest of the kebab category (max 8). */
const pickDishes: DishPicker = (tree) => {
  const all = tree.categories.flatMap((category) =>
    category.items.map((item) => ({ category, item })),
  );
  const featured = all.filter((d) => d.item.isFeatured && d.item.isAvailable);
  const kebab = all.filter(
    (d) => /kebab/i.test(d.category.slug) && d.item.isAvailable && !d.item.isFeatured,
  );
  return [...featured, ...kebab].slice(0, 8);
};

/** Pillar page: "Kebab w Kielcach z dostawą — Szef Donald". */
export default async function KebabKielcePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SeoLandingPage
      locale={locale}
      metaKey="kebabKielce"
      contentKey="kebabKielce"
      href="/kebab-kielce"
      breadcrumbName={locale === 'en' ? 'Kebab in Kielce' : 'Kebab Kielce'}
      pickDishes={pickDishes}
      dishesHeading="popularHeading"
      showMap
    />
  );
}
