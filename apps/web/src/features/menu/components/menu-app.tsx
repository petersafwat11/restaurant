'use client';

import { useAddToCart } from '@/features/cart/hooks';
import { useMenuTree } from '@/features/menu/hooks';
import type { MenuItemDto, MenuTreeDto, ModifierGroupDto } from '@repo/types';
import {
  Container,
  DishCard,
  type DishDetail,
  EmptyState,
  FilterPillMultiGroup,
  type FilterPillMultiOption,
  ItemDetailSheet,
  MenuSubNav,
  type ModifierGroupShape,
  type NewCartLine,
  SearchInput,
} from '@repo/ui';
import { Flame, Leaf, SearchX, WheatOff } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

type DietaryFilter = 'all' | 'vegetarian' | 'vegan' | 'gluten-free' | 'spicy';

const FILTER_OPTIONS: FilterPillMultiOption<DietaryFilter>[] = [
  { id: 'all', label: 'All' },
  { id: 'vegetarian', label: 'Vegetarian', icon: <Leaf size={14} /> },
  { id: 'vegan', label: 'Vegan', icon: <Leaf size={14} /> },
  { id: 'gluten-free', label: 'Gluten-free', icon: <WheatOff size={14} /> },
  { id: 'spicy', label: 'Spicy', icon: <Flame size={14} /> },
];

function itemFlagsOf(item: MenuItemDto): string[] {
  const flags: string[] = [];
  if (item.isVegetarian) flags.push('vegetarian');
  if (item.isVegan) flags.push('vegan');
  if (item.isGlutenFree) flags.push('gluten-free');
  if (item.spiceLevel >= 2) flags.push('spicy');
  if (item.isFeatured) flags.push('featured');
  return flags;
}

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

function adaptModifierGroup(g: ModifierGroupDto): ModifierGroupShape {
  return {
    id: g.id,
    name: g.name,
    required: g.isRequired,
    min: g.minSelect,
    max: g.maxSelect === 0 ? 99 : g.maxSelect,
    options: g.options.map((o) => ({
      id: o.id,
      name: o.name,
      priceDelta: o.priceDelta,
      default: o.isDefault,
    })),
  };
}

function adaptToDishDetail(
  item: MenuItemDto & { modifierGroups: ModifierGroupDto[] },
  currency: string,
): DishDetail {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? undefined,
    longDescription: item.description ?? undefined,
    basePrice: item.basePrice,
    currency,
    image: {
      src: item.images[0]?.url ?? '',
      alt: item.images[0]?.alt ?? item.name,
    },
    prepMinutes: item.prepMinutes ?? undefined,
    calories: item.calories ?? undefined,
    flags: itemFlagsOf(item) as DishDetail['flags'],
    modifierGroups: item.modifierGroups.map(adaptModifierGroup),
    unavailable: !item.isAvailable,
  };
}

export interface MenuAppProps {
  /** Fallback currency when the tree isn't loaded yet (avoids "" flicker). */
  currency?: string;
}

export function MenuApp({ currency = 'PLN' }: MenuAppProps) {
  const treeQuery = useMenuTree();
  const addMutation = useAddToCart();

  const [search, setSearch] = React.useState('');
  const [filters, setFilters] = React.useState<DietaryFilter[]>(['all']);
  const [activeCat, setActiveCat] = React.useState<string>('all');
  const [sheetItem, setSheetItem] = React.useState<DishDetail | null>(null);

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
      { rootMargin: '-200px 0px -60% 0px', threshold: 0 },
    );
    for (const c of filteredCategories) {
      const el = document.getElementById(`cat-${c.id}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [filteredCategories]);

  const goToCategory = React.useCallback((id: string) => {
    setActiveCat(id);
    if (id === 'all') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(`cat-${id}`);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 200;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, []);

  const handleAdd = React.useCallback(
    (item: MenuItemDto & { modifierGroups: ModifierGroupDto[] }) => {
      if (!item.isAvailable) return;
      if (item.modifierGroups.length > 0) {
        setSheetItem(adaptToDishDetail(item, currency));
        return;
      }
      addMutation.mutate({
        menuItemId: item.id,
        quantity: 1,
        modifierSelections: [],
      });
    },
    [addMutation, currency],
  );

  const handleSheetAdd = React.useCallback(
    (line: NewCartLine) => {
      // Re-shape NewCartLine → AddCartItemDto.
      const grouped = new Map<string, string[]>();
      for (const m of line.modifiers) {
        const arr = grouped.get(m.groupId) ?? [];
        arr.push(m.optionId);
        grouped.set(m.groupId, arr);
      }
      addMutation.mutate({
        menuItemId: line.itemId,
        quantity: line.quantity,
        modifierSelections: Array.from(grouped.entries()).map(([groupId, optionIds]) => ({
          groupId,
          optionIds,
        })),
        notes: line.notes,
      });
      toast.success('Added to cart', {
        description: `${line.quantity} × ${line.name}`,
      });
    },
    [addMutation],
  );

  if (treeQuery.isLoading) {
    return (
      <Container className="py-16">
        <p className="text-fg-muted">Loading menu…</p>
      </Container>
    );
  }

  if (treeQuery.isError || !tree) {
    return (
      <Container className="py-16">
        <EmptyState
          title="Couldn't load the menu"
          description="Something went wrong. Try refreshing."
          action={{ label: 'Reload', onClick: () => treeQuery.refetch() }}
        />
      </Container>
    );
  }

  const allItems = tree.categories.flatMap((c) => c.items);
  const showSearchEmpty = filteredCategories.length === 0 && search.trim();
  const showFilterEmpty =
    filteredCategories.length === 0 && !search.trim() && !filters.includes('all');

  const subnavSections = [
    { id: 'all', label: 'All', count: allItems.length },
    ...tree.categories.map((c) => ({ id: c.slug, label: c.name, count: c.items.length })),
  ];

  return (
    <>
      <Container className="pb-12 pt-16">
        <span className="text-eyebrow uppercase text-accent">Menu</span>
        <h1
          className="mt-4 font-display text-h2 text-fg sm:text-h1"
          style={{ textWrap: 'balance' as React.CSSProperties['textWrap'] }}
        >
          Built fresh, made to order.
        </h1>
        <p className="mt-4 max-w-[640px] text-body-l text-fg-muted">
          {allItems.length} dishes across {tree.categories.length} categories. Filter or search to
          find your usual.
        </p>
      </Container>

      <div className="sticky top-site-nav z-20">
        <div className="bg-bg">
          <Container className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search the menu…"
              shortcutKey="/"
              className="sm:max-w-sm"
            />
            <FilterPillMultiGroup
              options={FILTER_OPTIONS}
              value={filters}
              onChange={setFilters}
              allOptionId="all"
              ariaLabel="Dietary filters"
            />
          </Container>
        </div>
        <div className="border-b border-border/[var(--border-alpha)] bg-surface">
          <Container>
            <MenuSubNav
              sections={subnavSections.map((s) => ({
                ...s,
                id:
                  s.id === 'all'
                    ? 'all'
                    : (tree.categories.find((c) => c.slug === s.id)?.id ?? s.id),
              }))}
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
            title={`Nothing matches "${search}"`}
            description="Try a different word, or clear filters."
            action={{ label: 'Clear search', onClick: () => setSearch('') }}
          />
        )}
        {showFilterEmpty && (
          <EmptyState
            size="lg"
            icon={<Leaf size={48} strokeWidth={1.5} />}
            title="No dishes match your filters"
            description="Combine fewer filters to see more options."
            action={{ label: 'Clear filters', onClick: () => setFilters(['all']) }}
          />
        )}

        {filteredCategories.map((cat) => (
          <section
            key={cat.id}
            id={`cat-${cat.id}`}
            aria-labelledby={`h-${cat.id}`}
            className="scroll-mt-[12rem] pt-16"
          >
            <div className="mb-6 flex items-baseline justify-between gap-3">
              <h2 id={`h-${cat.id}`} className="font-display text-h2 text-fg">
                {cat.name}
              </h2>
              <div className="text-small text-fg-subtle">
                {cat.items.length} {cat.items.length === 1 ? 'item' : 'items'}
                {cat.description && <> · {cat.description}</>}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {cat.items.map((item) => (
                <DishCard
                  key={item.id}
                  href={`/menu#${item.slug}`}
                  image={{
                    src: item.images[0]?.url ?? '',
                    alt: item.images[0]?.alt ?? item.name,
                  }}
                  name={item.name}
                  description={item.description ?? undefined}
                  price={{ amount: item.basePrice, currency }}
                  flags={itemFlagsOf(item) as never}
                  unavailable={!item.isAvailable}
                  reserveFlagSpace
                  onAdd={() => handleAdd(item)}
                  onClick={(e) => {
                    e.preventDefault();
                    setSheetItem(adaptToDishDetail(item, currency));
                  }}
                />
              ))}
            </div>
          </section>
        ))}
      </Container>

      <ItemDetailSheet
        open={sheetItem !== null}
        onOpenChange={(o) => !o && setSheetItem(null)}
        item={sheetItem}
        onAddToCart={handleSheetAdd}
      />
    </>
  );
}
