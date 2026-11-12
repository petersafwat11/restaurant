import { type DishPicker, SeoLandingPage } from '@/features/seo/components/seo-landing-page';
import { seoMetadata } from '@/features/seo/load-seo';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return seoMetadata(locale, 'falafelKielce', '/falafel-kielce');
}

/** Every falafel dish (by category or name), in menu order. */
const pickDishes: DishPicker = (tree) =>
  tree.categories.flatMap((category) =>
    category.items
      .filter((item) => /falafel/i.test(category.slug) || /falafel/i.test(item.name))
      .map((item) => ({ category, item })),
  );

export default async function FalafelKielcePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SeoLandingPage
      locale={locale}
      metaKey="falafelKielce"
      contentKey="falafelKielce"
      href="/falafel-kielce"
      breadcrumbName={locale === 'en' ? 'Falafel in Kielce' : 'Falafel Kielce'}
      pickDishes={pickDishes}
      dishesHeading="dishesHeading"
    />
  );
}
