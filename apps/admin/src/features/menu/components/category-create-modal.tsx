'use client';

import { useCreateMenuCategory } from '@/features/menu/hooks';
import { ActionModal, FormField, Input } from '@repo/ui';
import { slugify } from '@repo/utils';
import * as React from 'react';

interface CategoryCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryCreateModal({ open, onOpenChange }: CategoryCreateModalProps) {
  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [slugTouched, setSlugTouched] = React.useState(false);
  const create = useCreateMenuCategory();

  React.useEffect(() => {
    if (open) {
      setName('');
      setSlug('');
      setSlugTouched(false);
    }
  }, [open]);

  const computedSlug = slugTouched ? slug : slugify(name);
  const valid = name.trim().length > 0 && computedSlug.length > 0;

  function submit() {
    if (!valid) return;
    create.mutate(
      { name: name.trim(), slug: computedSlug },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <ActionModal
      open={open}
      onOpenChange={onOpenChange}
      title="New category"
      description="Categories group menu items together (e.g. Starters, Mains, Desserts)."
      primary={{
        label: create.isPending ? 'Creating…' : 'Create category',
        onClick: submit,
        disabled: !valid || create.isPending,
        loading: create.isPending,
      }}
      secondary={{ label: 'Cancel', onClick: () => onOpenChange(false) }}
    >
      <div className="space-y-3">
        <FormField label="Name" required>
          <Input
            value={name}
            maxLength={60}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            placeholder="Starters"
          />
        </FormField>
        <FormField
          label="Slug"
          required
          helper="URL-friendly identifier — auto-generated from the name"
        >
          <Input
            value={computedSlug}
            maxLength={80}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
          />
        </FormField>
      </div>
    </ActionModal>
  );
}
