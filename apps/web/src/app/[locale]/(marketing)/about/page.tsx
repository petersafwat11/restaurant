import { getAlternates } from '@/lib/seo/alternates';
import { fetchPublicRestaurant } from '@/lib/seo/fetch-restaurant';
import { fetchStructuredData } from '@/lib/seo/fetch-structured-data';
import { JsonLd, buildAggregateRatingSchema } from '@/lib/seo/json-ld';
import { Container, SectionHeader } from '@repo/ui';
import type { Metadata } from 'next';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';

export function generateStaticParams() {
  return [{ locale: 'pl' }, { locale: 'en' }];
}

export function generateMetadata(): Metadata {
  return { alternates: getAlternates('/about') };
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
}

interface ReviewAggregate {
  ratingValue: number;
  reviewCount: number;
}

/**
 * Extract the `aggregateRating` from the Restaurant node in the cached
 * structured-data graph, when it exists. Avoids a second API round-trip:
 * the same fetch powers Menu JSON-LD on `/menu`.
 */
function extractAggregate(
  graph: { '@graph': Array<Record<string, unknown>> } | null,
): ReviewAggregate | null {
  if (!graph) return null;
  const restaurantNode = graph['@graph'].find((n) => n['@type'] === 'Restaurant');
  const agg = restaurantNode?.aggregateRating as Record<string, unknown> | undefined;
  if (!agg) return null;
  const ratingValue = typeof agg.ratingValue === 'number' ? agg.ratingValue : null;
  const reviewCount = typeof agg.reviewCount === 'number' ? agg.reviewCount : null;
  if (ratingValue == null || reviewCount == null || reviewCount <= 0) return null;
  return { ratingValue, reviewCount };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'web.marketing.about' });
  const numberLocale = (await getLocale()) === 'pl' ? 'pl-PL' : 'en-US';

  const restaurant = await fetchPublicRestaurant();
  const structured = restaurant ? await fetchStructuredData(restaurant.slug) : null;
  const aggregate = extractAggregate(structured);

  // The third stat card carries the rating. When the API returns real
  // review data, the card shows the live aggregate AND the page emits an
  // `AggregateRating` JSON-LD node whose values match what the user sees
  // (Google's rich-results policy requires the rendered content to match).
  // Without any visible reviews the page falls back to the static i18n
  // copy and emits no AggregateRating to avoid claiming reviews we can't show.
  const ratingDisplay = aggregate
    ? {
        value: aggregate.ratingValue.toLocaleString(numberLocale, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }),
        label: t('stats.ratingLabelDynamic', {
          count: aggregate.reviewCount.toLocaleString(numberLocale),
        }),
      }
    : { value: t('stats.ratingValue'), label: t('stats.ratingLabel') };

  const stats: Array<{ key: 'years' | 'wraps' | 'rating'; label: string; sub: string }> = [
    { key: 'years', label: t('stats.yearsValue'), sub: t('stats.yearsLabel') },
    { key: 'wraps', label: t('stats.wrapsValue'), sub: t('stats.wrapsLabel') },
    { key: 'rating', label: ratingDisplay.value, sub: ratingDisplay.label },
  ];

  const base = siteUrl();
  const aggregateSchema =
    restaurant && aggregate
      ? buildAggregateRatingSchema(restaurant, aggregate, { siteUrl: base })
      : null;

  return (
    <>
      {aggregateSchema ? <JsonLd id="ld-about-rating" data={aggregateSchema} /> : null}
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
