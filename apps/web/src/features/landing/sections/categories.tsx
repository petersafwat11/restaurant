'use client';

import { useMenuTree } from '@/features/menu/hooks';
import { CategoryCard, Container, SectionHeader } from '@repo/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';

/**
 * Landing "what we serve" strip — driven by the live menu tree (DB). Category
 * names + item counts come straight from the menu; the card image uses the
 * category's own `imageUrl` when set, otherwise the first available item photo
 * so the strip shows real food without requiring a separate upload.
 */
export function LandingCategories() {
  const t = useTranslations('web.marketing.home.categories');
  const { data } = useMenuTree();

  const categories = React.useMemo(() => {
    return (data?.categories ?? [])
      .filter((c) => c.items.length > 0)
      .map((c) => ({
        slug: c.slug,
        label: c.name,
        itemCount: c.items.length,
        image: c.imageUrl ?? c.items.find((i) => i.images[0]?.url)?.images[0]?.url ?? '',
      }));
  }, [data]);

  if (categories.length === 0) return null;

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
          {categories.map((c) => (
            <CategoryCard
              key={c.slug}
              href={`/menu#${c.slug}`}
              image={{ src: c.image, alt: t('categoryAlt', { label: c.label }) }}
              label={c.label}
              itemCount={c.itemCount}
              itemCountLabel={t('itemCount', { count: c.itemCount })}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
