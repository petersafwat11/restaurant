'use client';

import { useMenuTree } from '@/features/menu/hooks';
import { itemFlagsOf, useDishOrdering } from '@/features/menu/hooks/use-dish-ordering';
import { cheapestPrice, dishHref, dishImageAlt } from '@/features/menu/lib/dish-facts';
import { getPathname } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import type { MenuItemDto, MenuTreeDto } from '@repo/types';
import {
  Container,
  DishCard,
  EmptyState,
  FilterPillMultiGroup,
  type FilterPillMultiOption,
  MenuSubNav,
  SearchInput,
} from '@repo/ui';
import { Flame, Leaf, SearchX, WheatOff } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

type DietaryFilter = 'all' | 'vegetarian' | 'vegan' | 'gluten-free' | 'spicy';

function matchesFilters(item: MenuItemDto, filters: DietaryFilter[]): boolean {
  if (filters.length === 0 || filters.includes('all')) return true;
  const flags = itemFlagsOf(item);
  return filters.every((f) => flags.includes(f));
}

function matchesSearch(item: MenuItemDto, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase().trim();
  if (!needle) return true;
  return (
    item.name.toLowerCase().includes(needle) ||
    (item.description ?? '').toLowerCase().includes(needle)
  );
}

export interface MenuAppProps {
  /** Fallback currency when the tree isn't loaded yet (avoids "" flicker). */
  currency?: string;
}

/**
 * Interactive menu (search, diet filters, category sub-nav, add-to-cart).
 *
 * The page's H1 + intro are rendered by the server page; the menu tree is
 * seeded into the query cache server-side (`ServerDataHydration`), so the full
 * menu — categories as H2, dishes as H3 with description, price, weight and
 * image — is in the initial HTML. Each card links to its dish page; a click
 * opens the order sheet instead (unchanged ordering flow).
 */
export function MenuApp({ currency = 'PLN' }: MenuAppProps) {
  const t = useTranslations('web.shop.menu');
  const locale = useLocale() as AppLocale;
  const treeQuery = useMenuTree();
  const { openDish, quickAdd, sheet, flagLabels } = useDishOrdering(currency);

  const filterOptions = React.useMemo<FilterPillMultiOption<DietaryFilter>[]>(
    () => [
      { id: 'all', label: t('all') },
      { id: 'vegetarian', label: t('vegetarian'), icon: <Leaf size={14} /> },
      { id: 'vegan', label: t('vegan'), icon: <Leaf size={14} /> },
      { id: 'gluten-free', label: t('glutenFree'), icon: <WheatOff size={14} /> },
      { id: 'spicy', label: t('spicy'), icon: <Flame size={14} /> },
    ],
    [t],
  );

  const [search, setSearch] = React.useState('');
  const [filters, setFilters] = React.useState<DietaryFilter[]>(['all']);
  const [activeCat, setActiveCat] = React.useState<string>('all');

  // The sticky chrome (site nav + search/filters/subnav) is much taller on
  // mobile (rows stack) than on desktop, so a hardcoded scroll offset hides
  // category headings behind it. Measure it live and reuse for both the
  // category-jump scroll and the scroll-spy/scroll-margin.
  const stickyRef = React.useRef<HTMLDivElement | null>(null);
  const [scrollOffset, setScrollOffset] = React.useState(208);
  // biome-ignore lint/correctness/useExhaustiveDependencies: treeQuery.data is listed so the measurement re-runs once the sticky chrome mounts after the loading state clears.
  React.useEffect(() => {
    function measure() {
      const navH = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
      const stickyH = stickyRef.current?.getBoundingClientRect().height ?? 0;
      setScrollOffset(Math.round(navH + stickyH + 8));
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (stickyRef.current) ro.observe(stickyRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [treeQuery.data]);

  const tree: MenuTreeDto | undefined = treeQuery.data;

  const filteredCategories = React.useMemo(() => {
    if (!tree) return [];
    return tree.categories
      .map((c) => ({
        ...c,
        items: c.items.filter((i) => matchesFilters(i, filters) && matchesSearch(i, search)),
      }))
      .filter((c) => c.items.length > 0);
  }, [tree, search, filters]);

  // Scroll-spy: pick the section nearest the top below the sticky chrome.
  React.useEffect(() => {
    if (filteredCategories.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const first = visible[0];
        if (first) {
          const id = first.target.id.replace('cat-', '');
          setActiveCat(id);
        }
      },
      { rootMargin: `-${scrollOffset}px 0px -55% 0px`, threshold: 0 },
    );
    for (const c of filteredCategories) {
      const el = document.getElementById(`cat-${c.id}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [filteredCategories, scrollOffset]);

  const goToCategory = React.useCallback(
    (id: string) => {
      setActiveCat(id);
      if (id === 'all') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const el = document.getElementById(`cat-${id}`);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - scrollOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    },
    [scrollOffset],
  );

  if (treeQuery.isLoading) {
    return (
      <Container className="py-16">
        <p className="text-fg-muted">{t('loadingMenu')}</p>
      </Container>
    );
  }

  if (treeQuery.isError || !tree) {
    return (
      <Container className="py-16">
        <EmptyState
          title={t('error.title')}
          description={t('error.description')}
          action={{ label: t('error.reload'), onClick: () => treeQuery.refetch() }}
        />
      </Container>
    );
  }

  const allItems = tree.categories.flatMap((c) => c.items);
  const showSearchEmpty = filteredCategories.length === 0 && search.trim();
  const showFilterEmpty =
    filteredCategories.length === 0 && !search.trim() && !filters.includes('all');

  const subnavSections = [
    { id: 'all', label: t('all'), count: allItems.length },
    ...tree.categories.map((c) => ({ id: c.id, label: c.name, count: c.items.length })),
  ];

  return (
    <>
      <div ref={stickyRef} className="sticky top-site-nav z-20">
        <div className="bg-bg">
          <Container className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('searchPlaceholder')}
              shortcutKey="/"
              className="sm:max-w-sm"
            />
            <FilterPillMultiGroup
              options={filterOptions}
              value={filters}
              onChange={setFilters}
              allOptionId="all"
              ariaLabel={t('dietaryFiltersAria')}
            />
          </Container>
        </div>
        <div className="border-b border-border/[var(--border-alpha)] bg-surface">
          <Container>
            <MenuSubNav
              sections={subnavSections}
              activeId={activeCat}
              onSelect={(id) => goToCategory(id)}
            />
          </Container>
        </div>
      </div>

      <Container className="pb-24">
        {showSearchEmpty && (
          <EmptyState
            size="lg"
            icon={<SearchX size={48} strokeWidth={1.5} />}
            title={t('emptySearch.title', { query: search })}
            description={t('emptySearch.description')}
            action={{ label: t('emptySearch.clear'), onClick: () => setSearch('') }}
          />
        )}
        {showFilterEmpty && (
          <EmptyState
            size="lg"
            icon={<Leaf size={48} strokeWidth={1.5} />}
            title={t('emptyFilter.title')}
            description={t('emptyFilter.description')}
            action={{ label: t('emptyFilter.clear'), onClick: () => setFilters(['all']) }}
          />
        )}

        {filteredCategories.map((cat) => (
          <section
            key={cat.id}
            id={`cat-${cat.id}`}
            aria-labelledby={`h-${cat.id}`}
            className="pt-16"
            style={{ scrollMarginTop: scrollOffset }}
          >
            {/* Stable anchor for `/menu#<category-slug>` links. */}
            <span id={cat.slug} aria-hidden className="block" />
            <div className="mb-6 flex items-baseline justify-between gap-3">
              <h2 id={`h-${cat.id}`} className="font-display text-h2 text-fg">
                <a
                  href={getPathname({ locale, href: `/menu/${cat.slug}` })}
                  className="hover:text-accent"
                >
                  {cat.name}
                </a>
              </h2>
              <div className="text-small text-fg-subtle">
                {t('categoryItemCount', { count: cat.items.length })}
                {cat.description && <> · {cat.description}</>}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {cat.items.map((item) => (
                <DishCard
                  key={item.id}
                  href={getPathname({ locale, href: dishHref(cat.slug, item.slug) })}
                  image={{
                    src: item.images[0]?.url ?? '',
                    alt: dishImageAlt(item, locale),
                  }}
                  name={item.name}
                  description={item.description ?? undefined}
                  price={{ amount: cheapestPrice(item), currency }}
                  grams={item.grams}
                  formatWeight={(g) => t('weight', { grams: g })}
                  flags={itemFlagsOf(item) as never}
                  flagLabels={flagLabels}
                  soldOutLabel={t('soldOutToday')}
                  unavailable={!item.isAvailable}
                  reserveFlagSpace
                  onAdd={() => quickAdd(item)}
                  onClick={(e) => {
                    // Plain click opens the order sheet (as before); modified
                    // clicks (new tab) follow the link to the dish page.
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    openDish(item);
                  }}
                />
              ))}
            </div>
          </section>
        ))}
      </Container>

      {sheet}
    </>
  );
}
