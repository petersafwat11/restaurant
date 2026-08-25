'use client';

import { usePageHeader } from '@/components/shell/page-title-context';
import { RequirePermission } from '@/features/auth/components';
import {
  CategoriesPane,
  DeleteCategoryModal,
  ItemEditorDrawer,
  type ItemFilter,
  ItemsList,
} from '@/features/menu/components';
import { CategoryCreateModal } from '@/features/menu/components/category-create-modal';
import { useMenuTree } from '@/features/menu/hooks';
import type { MenuCategoryDto, MenuItemDto } from '@repo/types';
import { TwoPaneLayout } from '@repo/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';

/**
 * Unified Menu editor — `/menu`. Two-pane layout: categories on the left,
 * items on the right. Selecting a category populates the items pane; clicking
 * an item opens the editor drawer. All page-3 fixes from `.claude/plans/
 * admin-dashboard-port.md` §5.3 are wired in their respective primitives.
 */
export default function MenuPage() {
  const t = useTranslations('admin.menu');
  const tree = useMenuTree();

  const [activeCategoryId, setActiveCategoryId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<ItemFilter>('all');
  // Store only the item id — the item itself is derived from live tree data so
  // image add/remove/reorder mutations (which invalidate the tree) are
  // reflected in the open drawer immediately.
  const [drawerState, setDrawerState] = React.useState<
    { mode: 'edit'; itemId: string } | { mode: 'create' } | null
  >(null);
  const [deletingCategory, setDeletingCategory] = React.useState<MenuCategoryDto | null>(null);
  const [createCategoryOpen, setCreateCategoryOpen] = React.useState(false);

  const categories = tree.data?.categories ?? [];

  const editItem = React.useMemo<MenuItemDto | null>(() => {
    if (drawerState?.mode !== 'edit') return null;
    for (const c of categories) {
      const found = c.items.find((i) => i.id === drawerState.itemId);
      if (found) return found;
    }
    return null;
  }, [categories, drawerState]);

  // Auto-select first category when the tree resolves
  React.useEffect(() => {
    if (!activeCategoryId && categories[0]) setActiveCategoryId(categories[0].id);
  }, [activeCategoryId, categories]);

  const activeCategory = React.useMemo(
    () => categories.find((c) => c.id === activeCategoryId) ?? null,
    [categories, activeCategoryId],
  );

  usePageHeader({ title: t('title') });

  return (
    <RequirePermission perm="menu:read">
      {/* Fixed viewport height only at lg+, where the two panes sit side-by-side
          and scroll independently. Below lg the panes stack and the page scrolls,
          so a fixed height would clip the lower pane. */}
      <div className="lg:h-[calc(100vh-theme(spacing.topbar)-3rem)]">
        <TwoPaneLayout
          leftWidth={280}
          left={
            <CategoriesPane
              categories={categories}
              activeId={activeCategoryId}
              onSelect={setActiveCategoryId}
              onAdd={() => setCreateCategoryOpen(true)}
              onDeleteRequest={setDeletingCategory}
            />
          }
          right={
            <ItemsList
              category={activeCategory}
              filter={filter}
              onFilterChange={setFilter}
              onOpenItem={(item) => setDrawerState({ mode: 'edit', itemId: item.id })}
              onCreateItem={() => setDrawerState({ mode: 'create' })}
              loading={tree.isLoading}
            />
          }
        />
      </div>

      <ItemEditorDrawer
        item={drawerState?.mode === 'edit' ? editItem : null}
        category={activeCategory}
        onOpenChange={(open) => !open && setDrawerState(null)}
        mode={drawerState?.mode === 'create' ? 'create' : 'edit'}
        allCategories={categories}
      />

      <DeleteCategoryModal
        category={deletingCategory}
        siblings={categories}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
      />

      <CategoryCreateModal open={createCategoryOpen} onOpenChange={setCreateCategoryOpen} />
    </RequirePermission>
  );
}
