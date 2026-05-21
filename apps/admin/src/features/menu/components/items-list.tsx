'use client';

import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { useToggleItemAvailability } from '@/features/menu/hooks';
import type { MenuCategoryDto, MenuItemDto } from '@repo/types';
import { ColumnDef, DataTable, FilterPillGroup, Switch, cn } from '@repo/ui';
import { formatMoney } from '@repo/utils';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

export type ItemFilter = 'all' | 'available' | 'unavailable' | 'featured';

interface ItemsListProps {
  category: MenuCategoryDto | null;
  filter: ItemFilter;
  onFilterChange: (f: ItemFilter) => void;
  onOpenItem: (item: MenuItemDto) => void;
  onCreateItem: () => void;
  currency?: string;
}

/**
 * Right pane of the Menu page. Filter pills + DataTable. Click a row to open
 * the item editor drawer; toggle the availability switch inline.
 */
export function ItemsList({
  category,
  filter,
  onFilterChange,
  onOpenItem,
  onCreateItem,
  currency = 'USD',
}: ItemsListProps) {
  const t = useTranslations('admin.menu.items');
  const toggleAvailability = useToggleItemAvailability();
  const { has } = usePermissions();
  const canWrite = has('menu:write');

  const rows = React.useMemo(() => {
    if (!category) return [];
    return category.items.filter((it) => {
      if (filter === 'available') return it.isAvailable;
      if (filter === 'unavailable') return !it.isAvailable;
      if (filter === 'featured') return it.isFeatured;
      return true;
    });
  }, [category, filter]);

  const counts = React.useMemo(() => {
    if (!category) return { all: 0, available: 0, unavailable: 0, featured: 0 };
    return category.items.reduce(
      (acc, it) => {
        acc.all++;
        if (it.isAvailable) acc.available++;
        else acc.unavailable++;
        if (it.isFeatured) acc.featured++;
        return acc;
      },
      { all: 0, available: 0, unavailable: 0, featured: 0 },
    );
  }, [category]);

  const columns: ColumnDef<MenuItemDto>[] = React.useMemo(
    () => [
      {
        id: 'image',
        header: '',
        cell: (info) => {
          const img = info.row.original.images[0];
          return (
            <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-md bg-surface-2 text-xs font-medium text-fg-subtle">
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img.url}
                  alt={img.alt ?? ''}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                info.row.original.name.charAt(0).toUpperCase()
              )}
            </span>
          );
        },
        size: 60,
      },
      {
        id: 'name',
        header: t('columns.item'),
        accessorKey: 'name',
        cell: (info) => {
          const it = info.row.original;
          return (
            <div className="flex flex-col">
              <span className="text-sm text-fg">{it.name}</span>
              {it.description && (
                <span className="line-clamp-1 text-xs text-fg-subtle">{it.description}</span>
              )}
            </div>
          );
        },
      },
      {
        id: 'price',
        header: t('columns.price'),
        accessorKey: 'basePrice',
        cell: (info) => (
          <span className="tabular-nums text-fg">
            {formatMoney(info.getValue<string>(), currency)}
          </span>
        ),
        meta: { align: 'right' as const },
        size: 100,
      },
      {
        id: 'dietary',
        header: t('columns.dietary'),
        cell: (info) => {
          const it = info.row.original;
          const tags: string[] = [];
          if (it.isVegan) tags.push(t('dietaryTags.vegan'));
          else if (it.isVegetarian) tags.push(t('dietaryTags.vegetarian'));
          if (it.isGlutenFree) tags.push(t('dietaryTags.glutenFree'));
          if (it.spiceLevel > 0) tags.push('🌶'.repeat(Math.min(3, it.spiceLevel)));
          return (
            <span className="flex items-center gap-1 text-xs text-fg-muted">
              {tags.length === 0 ? (
                <span className="text-fg-subtle">—</span>
              ) : (
                tags.map((t) => (
                  <span key={t} className="rounded border-hairline-strong bg-surface px-1.5 py-0.5">
                    {t}
                  </span>
                ))
              )}
            </span>
          );
        },
        size: 140,
      },
      {
        id: 'available',
        header: t('columns.available'),
        cell: (info) => {
          const it = info.row.original;
          return (
            <span onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={it.isAvailable}
                disabled={!canWrite}
                onCheckedChange={(checked) =>
                  toggleAvailability.mutate({ id: it.id, isAvailable: checked })
                }
                aria-label={t('toggleAvailabilityAriaLabel')}
              />
            </span>
          );
        },
        size: 90,
      },
    ],
    [currency, toggleAvailability, canWrite, t],
  );

  if (!category) {
    return (
      <div className="grid h-full place-items-center rounded-card border-hairline bg-surface p-12 text-sm text-fg-muted">
        {t('selectCategoryPrompt')}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <FilterPillGroup<ItemFilter>
          value={filter}
          onChange={onFilterChange}
          options={[
            { id: 'all', label: t('filters.all'), count: counts.all },
            { id: 'available', label: t('filters.available'), count: counts.available },
            { id: 'unavailable', label: t('filters.unavailable'), count: counts.unavailable },
            { id: 'featured', label: t('filters.featured'), count: counts.featured },
          ]}
          ariaLabel={t('filterAriaLabel')}
        />
        {canWrite && (
          <div className="ml-auto">
            <button
              type="button"
              onClick={onCreateItem}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-medium text-bg transition-colors hover:bg-accent-hover"
            >
              <Plus size={13} /> {t('newItem')}
            </button>
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DataTable
          data={rows}
          columns={columns}
          rowKey={(r) => r.id}
          onRowClick={onOpenItem}
          emptyState={
            <div className="text-sm text-fg-muted">
              {filter === 'all'
                ? t('emptyAll', { name: category.name })
                : t('emptyFiltered', { filter: t(`filters.${filter}`) })}
            </div>
          }
        />
      </div>
    </div>
  );
}
