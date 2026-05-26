import { mockCategories } from '@/lib/mock/szef-donald';
import { CategoryCard, Container, SectionHeader } from '@repo/ui';
import { getTranslations } from 'next-intl/server';

export async function LandingCategories() {
  const t = await getTranslations('web.marketing.home.categories');
  return (
    <section aria-labelledby="cats-h" className="bg-bg py-section-y-mobile sm:py-section-y">
      <Container>
        <SectionHeader
          id="cats-h"
          eyebrow={t('eyebrow')}
          title={t('title')}
          action={{ label: t('viewFullMenu'), href: '/menu' }}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {mockCategories.map((c) => {
            const label = t(`labels.${c.slug}` as 'labels.kebab');
            return (
              <CategoryCard
                key={c.slug}
                href={`/menu#${c.slug}`}
                image={{ src: c.image, alt: t('categoryAlt', { label }) }}
                label={label}
                itemCount={c.itemCount}
                itemCountLabel={c.itemCount != null ? t('itemCount', { count: c.itemCount }) : undefined}
              />
            );
          })}
        </div>
      </Container>
    </section>
  );
}
