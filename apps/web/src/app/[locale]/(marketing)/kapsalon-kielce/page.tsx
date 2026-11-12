import { type DishPicker, SeoLandingPage } from '@/features/seo/components/seo-landing-page';
import { seoMetadata } from '@/features/seo/load-seo';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return seoMetadata(locale, 'kapsalonKielce', '/kapsalon-kielce');
}

/** The kapsalon dish and kapsalon combos. */
const pickDishes: DishPicker = (tree) =>
  tree.categories.flatMap((category) =>
    category.items
      .filter((item) => /kapsalon/i.test(item.name) || /kapsalon/i.test(item.slug))
      .map((item) => ({ category, item })),
  );

export default async function KapsalonKielcePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SeoLandingPage
      locale={locale}
      metaKey="kapsalonKielce"
      contentKey="kapsalonKielce"
      href="/kapsalon-kielce"
      breadcrumbName={locale === 'en' ? 'Kapsalon in Kielce' : 'Kapsalon Kielce'}
      pickDishes={pickDishes}
      dishesHeading="dishesHeading"
    />
  );
}
