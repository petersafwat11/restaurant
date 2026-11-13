import { dishImageAlt } from '@/features/menu/lib/dish-facts';
import { getPathname } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import type { MenuTreeDto } from '@repo/types';
import { CategoryCard, Container, SectionHeader } from '@repo/ui';
import { getLocale, getTranslations } from 'next-intl/server';

/**
 * Landing "what we serve" strip — driven by the live menu tree (DB). Category
 * names + item counts come straight from the menu; the card image uses the
 * category's own `imageUrl` when set, otherwise the first available item photo
 * so the strip shows real food without requiring a separate upload.
 *
 * Server Component (no interactivity): rendered from the tree the page already
 * fetched, so nothing here hydrates or ships the menu to the browser.
 */
export async function LandingCategories({ tree }: { tree: MenuTreeDto | null }) {
  const t = await getTranslations('web.marketing.home.categories');
  const locale = (await getLocale()) as AppLocale;

  const categories = (tree?.categories ?? [])
    .filter((c) => c.items.length > 0)
    .map((c) => {
      const photoDish = c.imageUrl ? null : c.items.find((i) => i.images[0]?.url);
      return {
        slug: c.slug,
        label: c.name,
        itemCount: c.items.length,
        image: c.imageUrl ?? photoDish?.images[0]?.url ?? '',
        // Describe what is actually in the photo: a dish photo gets the dish's
        // descriptive alt; an uploaded category image keeps the category label.
        alt: photoDish ? dishImageAlt(photoDish, locale) : t('categoryAlt', { label: c.name }),
      };
    });

  if (categories.length === 0) return null;

  return (
    <section aria-labelledby="cats-h" className="bg-bg py-section-y-mobile sm:py-section-y">
      <Container>
        <SectionHeader
          id="cats-h"
          eyebrow={t('eyebrow')}
          title={t('title')}
          action={{ label: t('viewFullMenu'), href: getPathname({ locale, href: '/menu' }) }}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => (
            <CategoryCard
              key={c.slug}
              href={getPathname({ locale, href: `/menu/${c.slug}` })}
              image={{
                src: c.image,
                alt: c.alt,
                // 2 cols on phones, 3 on tablets, 5 × ~250px on desktop.
                sizes: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 250px',
              }}
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
