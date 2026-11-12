import { CtaRow, FactsCard } from '@/features/seo/components/seo-blocks';
import { loadFactsLabels, seoH1, seoMetadata } from '@/features/seo/load-seo';
import { buildSeoVars, interpolate } from '@/features/seo/seo-vars';
import { fetchPublicRestaurant } from '@/lib/seo/fetch-restaurant';
import { Container, SectionHeader } from '@repo/ui';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return seoMetadata(locale, 'about', '/about');
}

/**
 * About (/about — "O nas"). Besides the story, it states the entity facts in
 * plain sentences (name, cuisine, address, opening year, hours, delivery) —
 * the form AI assistants quote when they describe a business.
 */
export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'web.marketing.about' });
  const tSeo = await getTranslations({ locale, namespace: 'web.seo.pages' });
  const restaurant = await fetchPublicRestaurant();
  const vars = restaurant ? buildSeoVars(restaurant, locale) : null;
  const h1 = await seoH1(locale, 'about', vars);
  const facts = vars ? (tSeo.raw('about.facts') as string[]).map((f) => interpolate(f, vars)) : [];
  const factsLabels = vars ? await loadFactsLabels(locale, vars) : null;

  // No unverified rating here — ratings are shown only with their source on
  // the home page.
  const stats: Array<{ key: 'years' | 'wraps'; label: string; sub: string }> = [
    { key: 'years', label: t('stats.yearsValue'), sub: t('stats.yearsLabel') },
    { key: 'wraps', label: t('stats.wrapsValue'), sub: t('stats.wrapsLabel') },
  ];

  return (
    <>
      <section className="bg-bg pt-section-y-mobile sm:pt-section-y">
        <Container>
          <SectionHeader
            as="h1"
            eyebrow={t('eyebrow')}
            title={h1}
            description={t('description')}
            align="center"
          />
        </Container>
      </section>

      <section className="bg-surface py-section-y-mobile sm:py-section-y">
        <Container>
          <div className="mx-auto flex max-w-2xl flex-col gap-4 text-body-l text-fg">
            <p>{t('paragraph1')}</p>
            <p className="text-fg-muted">{t('paragraph2')}</p>
          </div>
        </Container>
      </section>

      {facts.length > 0 && restaurant && factsLabels && (
        <section className="bg-bg py-section-y-mobile sm:py-section-y">
          <Container>
            <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="flex flex-col gap-4">
                <h2 className="font-display text-h3 text-fg sm:text-h2">
                  {tSeo('about.factsHeading')}
                </h2>
                {facts.map((f) => (
                  <p key={f} className="text-body-l text-fg-muted">
                    {f}
                  </p>
                ))}
                {vars && (
                  <CtaRow
                    primary={{
                      label: interpolate(tSeo.raw('common.ctaOrderDelivery') as string, vars),
                      href: '/menu',
                    }}
                    secondary={{ label: tSeo('common.kebabPillarLink'), href: '/kebab-kielce' }}
                  />
                )}
              </div>
              <FactsCard restaurant={restaurant} locale={locale} labels={factsLabels} />
            </div>
          </Container>
        </section>
      )}

      <section className="bg-bg py-section-y-mobile sm:py-section-y">
        <Container>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {stats.map((s) => (
              <div
                key={s.key}
                className="flex flex-col gap-1 rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated p-6 text-center"
              >
                <span className="font-display text-[40px] font-medium text-fg">{s.label}</span>
                <span className="text-small text-fg-muted">{s.sub}</span>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
