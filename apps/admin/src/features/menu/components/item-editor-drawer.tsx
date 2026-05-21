'use client';

import { usePermissions } from '@/features/auth/hooks/use-permissions';
import {
  useAddMenuItemImage,
  useCreateMenuItem,
  useDeleteMenuItem,
  useMenuItem,
  useRemoveMenuItemImage,
  useReorderMenuItemImages,
  useUpdateMenuItem,
} from '@/features/menu/hooks';
import { useUploadImage } from '@/features/uploads/hooks/use-upload-image';
import type { MenuCategoryDto, MenuItemDto } from '@repo/types';
import {
  Button,
  CurrencyInput,
  DetailDrawer,
  FormField,
  ImageUploader,
  Input,
  SectionedDrawerBody,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Switch,
  Textarea,
  type UploadedImage,
  cn,
} from '@repo/ui';
import { Flame, ImageIcon, ListChecks, Sparkles, Trash2 } from 'lucide-react';
import * as React from 'react';
import { ModifierGroupsEditor } from './modifier-groups-editor';

interface ItemEditorDrawerProps {
  /** Item from the tree (basic fields). null = closed. */
  item: MenuItemDto | null;
  /** Category that owns the item — provides slug for detail fetch. */
  category: MenuCategoryDto | null;
  onOpenChange: (open: boolean) => void;
  /** When true, the drawer is in create mode and creates a new item on save. */
  mode: 'edit' | 'create';
  /** All categories (for the category select in Details). */
  allCategories: MenuCategoryDto[];
  currency?: string;
}

type Draft = Pick<
  MenuItemDto,
  | 'name'
  | 'slug'
  | 'description'
  | 'categoryId'
  | 'basePrice'
  | 'compareAt'
  | 'calories'
  | 'prepMinutes'
  | 'spiceLevel'
  | 'isVegetarian'
  | 'isVegan'
  | 'isGlutenFree'
  | 'isFeatured'
  | 'isAvailable'
>;

const EMPTY_DRAFT: Draft = {
  name: '',
  slug: '',
  description: null,
  categoryId: '',
  basePrice: '0.00',
  compareAt: null,
  calories: null,
  prepMinutes: null,
  spiceLevel: 0,
  isVegetarian: false,
  isVegan: false,
  isGlutenFree: false,
  isFeatured: false,
  isAvailable: true,
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseIntOrNull(s: string): number | null {
  if (s.trim() === '') return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function ItemEditorDrawer({
  item,
  category,
  onOpenChange,
  mode,
  allCategories,
  currency = 'USD',
}: ItemEditorDrawerProps) {
  const open = item !== null || mode === 'create';
  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT);

  React.useEffect(() => {
    if (item) {
      setDraft({
        name: item.name,
        slug: item.slug,
        description: item.description,
        categoryId: item.categoryId,
        basePrice: item.basePrice,
        compareAt: item.compareAt,
        calories: item.calories,
        prepMinutes: item.prepMinutes,
        spiceLevel: item.spiceLevel,
        isVegetarian: item.isVegetarian,
        isVegan: item.isVegan,
        isGlutenFree: item.isGlutenFree,
        isFeatured: item.isFeatured,
        isAvailable: item.isAvailable,
      });
    } else if (mode === 'create' && category) {
      setDraft({ ...EMPTY_DRAFT, categoryId: category.id });
    }
  }, [item, mode, category]);

  const create = useCreateMenuItem();
  const update = useUpdateMenuItem(item?.id ?? '');
  const remove = useDeleteMenuItem();
  const { has } = usePermissions();
  const canWrite = has('menu:write');

  // Pull modifier-groups detail by slug — only when we have an existing item.
  const detailQuery = useMenuItem(category?.slug ?? '', item?.slug ?? '');
  const detail = mode === 'edit' && item ? detailQuery.data : undefined;

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    if (mode === 'create') {
      create.mutate(
        {
          ...draft,
          slug: draft.slug || slugify(draft.name),
        },
        {
          onSuccess: () => onOpenChange(false),
        },
      );
    } else if (item) {
      update.mutate(draft, {
        onSuccess: () => onOpenChange(false),
      });
    }
  }

  function destroy() {
    if (!item) return;
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    remove.mutate({ id: item.id }, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      width={620}
      ariaLabel={mode === 'create' ? 'New item' : 'Edit item'}
      flushBody
      header={
        <div className="px-6 py-4">
          <div className="text-caption-admin text-fg-subtle">
            {mode === 'create' ? 'New item' : 'Edit item'}
          </div>
          <div className="mt-1 text-h2-admin text-fg">
            {draft.name || (mode === 'create' ? 'Untitled item' : '')}
          </div>
        </div>
      }
      footer={
        <div className="flex w-full items-center gap-2">
          {mode === 'edit' && item && canWrite && (
            <Button variant="ghost" onClick={destroy} className="text-negative hover:text-negative">
              <Trash2 size={13} /> Delete
            </Button>
          )}
          <Button variant="ghost" className="ml-auto" onClick={() => onOpenChange(false)}>
            {canWrite ? 'Cancel' : 'Close'}
          </Button>
          {canWrite && (
            <Button
              variant="primary"
              onClick={save}
              disabled={!draft.name || !draft.categoryId || create.isPending || update.isPending}
            >
              {mode === 'create' ? 'Create item' : 'Save changes'}
            </Button>
          )}
        </div>
      }
    >
      <SectionedDrawerBody
        sections={[
          {
            id: 'details',
            label: 'Details',
            icon: Sparkles,
            children: (
              <DetailsSection
                draft={draft}
                set={set}
                categories={allCategories}
                currency={currency}
              />
            ),
          },
          {
            id: 'dietary',
            label: 'Dietary',
            icon: Flame,
            children: <DietarySection draft={draft} set={set} />,
          },
          {
            id: 'images',
            label: 'Images',
            icon: ImageIcon,
            children:
              mode === 'edit' && item ? (
                <ImagesSection itemId={item.id} images={item.images} />
              ) : (
                <div className="rounded-md border-hairline bg-surface p-4 text-sm text-fg-subtle">
                  Save the item first to add images.
                </div>
              ),
          },
          {
            id: 'modifiers',
            label: 'Modifiers',
            icon: ListChecks,
            children:
              mode === 'edit' && item ? (
                detail ? (
                  <ModifierGroupsEditor
                    itemId={item.id}
                    groups={detail.modifierGroups}
                    currency={currency}
                  />
                ) : detailQuery.isError ? (
                  <div className="rounded-md border-hairline bg-surface p-4 text-sm text-negative">
                    Couldn't load modifier groups. {detailQuery.error?.message ?? ''}
                    <button
                      type="button"
                      onClick={() => detailQuery.refetch()}
                      className="ml-2 underline"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-10">
                    <Spinner size="md" />
                  </div>
                )
              ) : (
                <div className="rounded-md border-hairline bg-surface p-4 text-sm text-fg-subtle">
                  Save the item first to add modifier groups.
                </div>
              ),
          },
        ]}
      />
    </DetailDrawer>
  );
}

interface DetailsSectionProps {
  draft: Draft;
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  categories: MenuCategoryDto[];
  currency: string;
}

function DetailsSection({ draft, set, categories, currency }: DetailsSectionProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label="Name" required className="sm:col-span-2">
        <Input
          value={draft.name}
          maxLength={160}
          onChange={(e) => {
            const name = e.target.value;
            set('name', name);
            if (!draft.slug) set('slug', slugify(name));
          }}
        />
      </FormField>
      <FormField label="Slug" required helper="URL-friendly, a-z0-9 + hyphens">
        <Input value={draft.slug} maxLength={120} onChange={(e) => set('slug', e.target.value)} />
      </FormField>
      <FormField label="Category" required>
        <Select value={draft.categoryId} onValueChange={(v) => set('categoryId', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Pick a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Description" className="sm:col-span-2">
        <Textarea
          value={draft.description ?? ''}
          rows={3}
          maxLength={2000}
          onChange={(e) => set('description', e.target.value || null)}
        />
      </FormField>
      <FormField label="Base price" required>
        <CurrencyInput
          value={draft.basePrice}
          onChange={(v) => set('basePrice', v ?? '0.00')}
          currency={currency}
          min={0}
        />
      </FormField>
      <FormField label="Compare at" helper="Original price — shown struck-through next to base.">
        <CurrencyInput
          value={draft.compareAt ?? ''}
          onChange={(v) => set('compareAt', v ? v : null)}
          currency={currency}
          min={0}
        />
      </FormField>
      <FormField label="Calories">
        <Input
          type="number"
          min={0}
          value={draft.calories ?? ''}
          onChange={(e) => set('calories', parseIntOrNull(e.target.value))}
          className="tabular-nums"
        />
      </FormField>
      <FormField label="Prep time (min)">
        <Input
          type="number"
          min={0}
          value={draft.prepMinutes ?? ''}
          onChange={(e) => set('prepMinutes', parseIntOrNull(e.target.value))}
          className="tabular-nums"
        />
      </FormField>
      <FormField label="Spice level">
        <div className="flex h-9 items-center gap-1.5">
          {[0, 1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={draft.spiceLevel === n}
              onClick={() => set('spiceLevel', n)}
              className={cn(
                'inline-flex h-7 min-w-7 items-center justify-center rounded-md border text-xs font-medium',
                draft.spiceLevel === n
                  ? 'border-accent bg-accent/[0.10] text-accent'
                  : 'border-border/[var(--border-strong-alpha)] bg-surface text-fg-muted hover:text-fg',
              )}
            >
              {n === 0 ? 'None' : '🌶'.repeat(n)}
            </button>
          ))}
        </div>
      </FormField>
    </div>
  );
}

function DietarySection({
  draft,
  set,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}) {
  const flags: Array<{
    key: 'isVegetarian' | 'isVegan' | 'isGlutenFree' | 'isFeatured';
    label: string;
    sub: string;
  }> = [
    { key: 'isVegetarian', label: 'Vegetarian', sub: 'No meat or fish.' },
    { key: 'isVegan', label: 'Vegan', sub: 'No animal products.' },
    { key: 'isGlutenFree', label: 'Gluten-free', sub: 'Made without gluten.' },
    { key: 'isFeatured', label: 'Featured', sub: 'Promote on the menu.' },
  ];
  return (
    <div className="flex flex-col gap-2">
      {flags.map(({ key, label, sub }) => (
        <label
          key={key}
          className="flex items-center justify-between gap-3 rounded-md border-hairline bg-surface p-3"
        >
          <div>
            <div className="text-sm text-fg">{label}</div>
            <div className="text-xs text-fg-subtle">{sub}</div>
          </div>
          <Switch checked={draft[key]} onCheckedChange={(c) => set(key, c)} />
        </label>
      ))}
    </div>
  );
}

interface ImagesSectionProps {
  itemId: string;
  images: MenuItemDto['images'];
}

function ImagesSection({ itemId, images }: ImagesSectionProps) {
  const upload = useUploadImage();
  const attach = useAddMenuItemImage(itemId);
  const removeImg = useRemoveMenuItemImage(itemId);
  const reorder = useReorderMenuItemImages(itemId);

  const uploaded: UploadedImage[] = images.map((i) => ({
    id: i.id,
    url: i.url,
    alt: i.alt ?? undefined,
  }));

  async function onAdd(files: File[]) {
    for (const file of files) {
      try {
        const result = await upload.mutateAsync({ file, kind: 'menu-item-image' });
        await attach.mutateAsync({ key: result.key, alt: null });
      } catch {
        /* notify handles errors */
      }
    }
  }

  return (
    <ImageUploader
      images={uploaded}
      onAdd={onAdd}
      onRemove={(id) => removeImg.mutate({ imageId: id })}
      onReorder={(next) => reorder.mutate({ orderedIds: next.map((i) => i.id) })}
      max={8}
      aspect={4 / 3}
    />
  );
}
