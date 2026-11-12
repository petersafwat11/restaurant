import { FactsCard } from '@/features/seo/components/seo-blocks';
import { loadFactsLabels, seoH1, seoMetadata } from '@/features/seo/load-seo';
import { buildSeoVars } from '@/features/seo/seo-vars';
import { fetchPublicRestaurant } from '@/lib/seo/fetch-restaurant';
import { Container } from '@repo/ui';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import ContactApp from './contact-app';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return seoMetadata(locale, 'contact', '/contact');
}

/**
 * Contact page. Address / phone come from the server-hydrated restaurant
 * query; the facts card (hours, delivery, payments) is plain server HTML.
 */
export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const restaurant = await fetchPublicRestaurant();
  const vars = restaurant ? buildSeoVars(restaurant, locale) : null;
  const h1 = await seoH1(locale, 'contact', vars);
  const labels = vars ? await loadFactsLabels(locale, vars) : null;
  return (
    <>
      <ContactApp h1={h1} />
      {restaurant && labels && (
        <section className="bg-bg pb-section-y-mobile sm:pb-section-y">
          <Container>
            <div className="mx-auto max-w-[960px]">
              <FactsCard restaurant={restaurant} locale={locale} labels={labels} />
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
