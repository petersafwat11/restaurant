'use client';

import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { useReorderCategories, useUpdateMenuCategory } from '@/features/menu/hooks';
import type { MenuCategoryDto } from '@repo/types';
import { DragReorderList, InlineEdit, cn } from '@repo/ui';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

interface CategoriesPaneProps {
  categories: MenuCategoryDto[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDeleteRequest: (category: MenuCategoryDto) => void;
}

/**
 * Left pane of the Menu page — list of categories with drag-to-reorder,
 * inline name editing, and per-row delete that defers to the parent
 * (which opens an ActionModal with move-to-target picker, page-3 fix #6).
 *
 * Inline edits commit on Enter/blur via `useUpdateMenuCategory` (page-3
 * fix #7 — uses the shared `InlineEdit` primitive instead of custom
 * contenteditable behavior).
 */
export function CategoriesPane({
  categories,
  activeId,
  onSelect,
  onAdd,
  onDeleteRequest,
}: CategoriesPaneProps) {
  const t = useTranslations('admin.menu.categories');
  const reorder = useReorderCategories();
  const { has } = usePermissions();
  const canWrite = has('menu:write');

  function handleReorder(next: MenuCategoryDto[]) {
    if (!canWrite) return;
    reorder.mutate({ orderedIds: next.map((c) => c.id) });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between px-2">
        <div className="text-caption-admin text-fg-subtle">{t('heading')}</div>
        {canWrite && (
          <button
            type="button"
            onClick={onAdd}
            aria-label={t('addAriaLabel')}
            className="grid h-6 w-6 place-items-center rounded-md text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-1">
        <DragReorderList
          items={categories}
          rowKey={(c) => c.id}
          onReorder={handleReorder}
          gap={2}
          disabled={!canWrite}
          emptyState={
            <div className="rounded-md border-hairline bg-surface px-3 py-6 text-center text-xs text-fg-subtle">
              {t('empty')}
            </div>
          }
          renderItem={(c, { handle }) => (
            <CategoryRow
              category={c}
              isActive={c.id === activeId}
              onSelect={() => onSelect(c.id)}
              onDeleteRequest={() => onDeleteRequest(c)}
              handle={handle}
              canWrite={canWrite}
              dragLabel={t('dragAriaLabel')}
              deleteLabel={t('deleteAriaLabel')}
              nameLabel={t('nameAriaLabel')}
              nameRequiredMessage={t('nameRequired')}
            />
          )}
        />
      </div>
    </div>
  );
}

interface CategoryRowProps {
  category: MenuCategoryDto;
  isActive: boolean;
  onSelect: () => void;
  onDeleteRequest: () => void;
  handle: {
    attributes: React.HTMLAttributes<HTMLElement>;
    listeners: React.HTMLAttributes<HTMLElement> | undefined;
    className: string;
  };
  canWrite: boolean;
  dragLabel: string;
  deleteLabel: string;
  nameLabel: string;
  nameRequiredMessage: string;
}

function CategoryRow({
  category,
  isActive,
  onSelect,
  onDeleteRequest,
  handle,
  canWrite,
  dragLabel,
  deleteLabel,
  nameLabel,
  nameRequiredMessage,
}: CategoryRowProps) {
  const update = useUpdateMenuCategory(category.id);
  return (
    <div
      className={cn(
        'group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors',
        isActive ? 'bg-accent/[0.10] text-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
      )}
    >
      {canWrite && (
        <button
          type="button"
          {...handle.attributes}
          {...handle.listeners}
          className={cn(handle.className, 'opacity-0 group-hover:opacity-100')}
          aria-label={dragLabel}
        >
          <GripVertical size={14} />
        </button>
      )}
      {canWrite ? (
        // Can't wrap an editable button (InlineEdit) inside a `<button>` —
        // nested buttons are invalid HTML and cause a React hydration error.
        // Use a row-level click target via a div + keyboard handler.
        <div
          // biome-ignore lint/a11y/useSemanticElements: nested-button HTML conflict — see comment above
          role="button"
          tabIndex={0}
          onClick={onSelect}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect();
            }
          }}
          className="flex flex-1 items-center gap-2 text-left outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-md"
        >
          <InlineEdit
            value={category.name}
            onCommit={(v) => update.mutate({ name: v })}
            ariaLabel={nameLabel}
            validate={(v) => (v.length === 0 ? nameRequiredMessage : null)}
          />
          <span className="ml-auto text-[11px] tabular-nums text-fg-subtle">
            {category.items.length}
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={onSelect}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span>{category.name}</span>
          <span className="ml-auto text-[11px] tabular-nums text-fg-subtle">
            {category.items.length}
          </span>
        </button>
      )}
      {canWrite && (
        <button
          type="button"
          onClick={onDeleteRequest}
          aria-label={deleteLabel}
          className="grid h-6 w-6 place-items-center rounded-md text-fg-subtle opacity-0 transition-opacity hover:bg-negative/15 hover:text-negative group-hover:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}
