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
import * as React from 'react';

/**
 * Unified Menu editor — `/menu`. Two-pane layout: categories on the left,
 * items on the right. Selecting a category populates the items pane; clicking
 * an item opens the editor drawer. All page-3 fixes from `.claude/plans/
 * admin-dashboard-port.md` §5.3 are wired in their respective primitives.
 */
export default function MenuPage() {
  const tree = useMenuTree();

  const [activeCategoryId, setActiveCategoryId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<ItemFilter>('all');
  const [drawerState, setDrawerState] = React.useState<
    { mode: 'edit'; item: MenuItemDto } | { mode: 'create' } | null
  >(null);
  const [deletingCategory, setDeletingCategory] = React.useState<MenuCategoryDto | null>(null);
  const [createCategoryOpen, setCreateCategoryOpen] = React.useState(false);

  const categories = tree.data?.categories ?? [];

  // Auto-select first category when the tree resolves
  React.useEffect(() => {
    if (!activeCategoryId && categories[0]) setActiveCategoryId(categories[0].id);
  }, [activeCategoryId, categories]);

  const activeCategory = React.useMemo(
    () => categories.find((c) => c.id === activeCategoryId) ?? null,
    [categories, activeCategoryId],
  );

  usePageHeader({ title: 'Menu' });

  return (
    <RequirePermission perm="menu:read">
      <div className="h-[calc(100vh-theme(spacing.topbar)-3rem)]">
        <TwoPaneLayout
          leftWidth={280}
          collapseBelow={1024}
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
              onOpenItem={(item) => setDrawerState({ mode: 'edit', item })}
              onCreateItem={() => setDrawerState({ mode: 'create' })}
            />
          }
        />
      </div>

      <ItemEditorDrawer
        item={drawerState?.mode === 'edit' ? drawerState.item : null}
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
