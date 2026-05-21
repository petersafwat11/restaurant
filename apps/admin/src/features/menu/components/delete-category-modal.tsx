'use client';

import { useDeleteMenuCategory } from '@/features/menu/hooks';
import { menuQueryKeys } from '@/features/menu/query-keys';
import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { MenuCategoryDto } from '@repo/types';
import {
  ActionModal,
  FormField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui';
import { useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

interface DeleteCategoryModalProps {
  category: MenuCategoryDto | null;
  /** All sibling categories — feeds the "move to" picker. */
  siblings: MenuCategoryDto[];
  onOpenChange: (open: boolean) => void;
}

export function DeleteCategoryModal({
  category,
  siblings,
  onOpenChange,
}: DeleteCategoryModalProps) {
  const open = category !== null;
  const others = React.useMemo(
    () => siblings.filter((c) => c.id !== category?.id),
    [siblings, category],
  );
  const [moveTo, setMoveTo] = React.useState<string>('');
  const [moving, setMoving] = React.useState(false);
  const deleteCategory = useDeleteMenuCategory();
  const qc = useQueryClient();

  React.useEffect(() => {
    if (open && others[0]) setMoveTo(others[0].id);
  }, [open, others]);

  const hasItems = (category?.items.length ?? 0) > 0;
  const needsTarget = hasItems;
  const valid = !needsTarget || !!moveTo;
  const busy = moving || deleteCategory.isPending;

  async function submit() {
    if (!category) return;
    if (hasItems) {
      if (!moveTo) return;
      setMoving(true);
      try {
        // Move each item sequentially so a partial failure leaves a clear
        // boundary — we surface the failure and skip the delete instead of
        // orphaning items in a deleted category.
        for (const item of category.items) {
          await getApiClient().menu.items.update(item.id, { categoryId: moveTo });
        }
      } catch (err) {
        notify('error', `Couldn't move items: ${(err as Error).message}`);
        qc.invalidateQueries({ queryKey: menuQueryKeys.tree() });
        setMoving(false);
        return;
      }
      qc.invalidateQueries({ queryKey: menuQueryKeys.tree() });
      setMoving(false);
    }
    deleteCategory.mutate({ id: category.id }, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <ActionModal
      open={open}
      onOpenChange={onOpenChange}
      variant="destructive"
      title={category ? `Delete "${category.name}"?` : 'Delete category'}
      description={
        hasItems
          ? `This category has ${category?.items.length} item${
              (category?.items.length ?? 0) === 1 ? '' : 's'
            }. Pick a category to move them to — they won't be deleted.`
          : 'This action cannot be undone.'
      }
      primary={{
        label: 'Delete category',
        onClick: submit,
        disabled: !valid || busy,
        loading: busy,
      }}
      secondary={{ label: 'Cancel', onClick: () => onOpenChange(false) }}
    >
      {hasItems && (
        <FormField label="Move items to" required>
          <Select value={moveTo} onValueChange={setMoveTo}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a category" />
            </SelectTrigger>
            <SelectContent>
              {others.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}
    </ActionModal>
  );
}
