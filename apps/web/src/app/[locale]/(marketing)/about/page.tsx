import type { Metadata } from 'next';
import { Container, SectionHeader } from '@repo/ui';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getAlternates } from '@/lib/seo/alternates';

export function generateStaticParams() {
  return [{ locale: 'pl' }, { locale: 'en' }];
}

export function generateMetadata(): Metadata {
  return { alternates: getAlternates('/about') };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'web.marketing.about' });

  const stats: Array<{ key: 'years' | 'wraps' | 'rating'; label: string; sub: string }> = [
    { key: 'years', label: t('stats.yearsValue'), sub: t('stats.yearsLabel') },
    { key: 'wraps', label: t('stats.wrapsValue'), sub: t('stats.wrapsLabel') },
    { key: 'rating', label: t('stats.ratingValue'), sub: t('stats.ratingLabel') },
  ];

  return (
    <>
      <section className="bg-bg pt-section-y-mobile sm:pt-section-y">
        <Container>
          <SectionHeader
            eyebrow={t('eyebrow')}
            title={t('title')}
            description={t('description')}
            align="center"
          />
        </Container>
      </section>

      <section className="bg-surface py-section-y-mobile sm:py-section-y">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="aspect-[4/5] w-full overflow-hidden rounded-image-lg bg-surface-warm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&w=1100&q=85"
                alt={t('imageAlt')}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col gap-4 text-body-l text-fg">
              <p>{t('paragraph1')}</p>
              <p className="text-fg-muted">{t('paragraph2')}</p>
              <p className="text-fg-muted">{t('paragraph3')}</p>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-bg py-section-y-mobile sm:py-section-y">
        <Container>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
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
