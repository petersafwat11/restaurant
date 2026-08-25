import { getAlternates } from '@/lib/seo/alternates';
import { Container, SectionHeader } from '@repo/ui';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

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

  // No unverified Google rating here — the same 4.1/213 figure was removed from
  // the homepage as unsubstantiated social proof (Slice 7 / plan §H1). If the
  // owner wants to show a real rating, wire it from a verified source.
  const stats: Array<{ key: 'years' | 'wraps'; label: string; sub: string }> = [
    { key: 'years', label: t('stats.yearsValue'), sub: t('stats.yearsLabel') },
    { key: 'wraps', label: t('stats.wrapsValue'), sub: t('stats.wrapsLabel') },
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
          <div className="mx-auto flex max-w-2xl flex-col gap-4 text-body-l text-fg">
            <p>{t('paragraph1')}</p>
            <p className="text-fg-muted">{t('paragraph2')}</p>
            <p className="text-fg-muted">{t('paragraph3')}</p>
          </div>
        </Container>
      </section>

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
