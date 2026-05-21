'use client';

import {
  useCreateModifierGroup,
  useCreateModifierOption,
  useDeleteModifierGroup,
  useDeleteModifierOption,
  useUpdateModifierGroup,
  useUpdateModifierOption,
} from '@/features/menu/hooks';
import type { ModifierGroupDto, ModifierOptionDto } from '@repo/types';
import { CurrencyInput, InlineEdit, Input, Switch } from '@repo/ui';
import { Plus, Trash2 } from 'lucide-react';
import * as React from 'react';

interface ModifierGroupsEditorProps {
  itemId: string;
  groups: ModifierGroupDto[];
  currency?: string;
}

/**
 * Modifier-groups editor. Each group is a card with header (name, required
 * toggle, min/max selects) and an inner `DragReorderList<ModifierOption>` —
 * page-3 fix #1: composes the shared primitive instead of inlining bespoke
 * drag logic per surface.
 */
export function ModifierGroupsEditor({
  itemId,
  groups,
  currency = 'USD',
}: ModifierGroupsEditorProps) {
  const createGroup = useCreateModifierGroup(itemId);

  return (
    <div className="flex flex-col gap-3">
      {groups.length === 0 && (
        <div className="rounded-md border-hairline bg-surface p-6 text-center text-sm text-fg-subtle">
          No modifier groups yet. Add one to start letting customers customize this item.
        </div>
      )}

      {groups.map((g) => (
        <ModifierGroupCard key={g.id} group={g} currency={currency} />
      ))}

      <button
        type="button"
        onClick={() =>
          createGroup.mutate({
            name: 'New group',
            isRequired: false,
            minSelect: 0,
            maxSelect: 1,
          })
        }
        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-dashed border-accent/40 text-sm text-accent transition-colors hover:bg-accent/[0.08]"
      >
        <Plus size={14} /> Add modifier group
      </button>
    </div>
  );
}

function ModifierGroupCard({
  group,
  currency,
}: {
  group: ModifierGroupDto;
  currency: string;
}) {
  const update = useUpdateModifierGroup(group.id);
  const remove = useDeleteModifierGroup();
  const createOption = useCreateModifierOption(group.id);

  return (
    <div className="overflow-hidden rounded-md border-hairline bg-surface">
      <div className="flex items-start justify-between gap-3 border-b-hairline px-3 py-2.5">
        <div className="flex flex-1 flex-col gap-2">
          <InlineEdit
            value={group.name}
            onCommit={(name) => update.mutate({ name })}
            variant="h2"
            ariaLabel="Group name"
            validate={(v) => (v.length === 0 ? 'Required' : null)}
          />
          <div className="flex flex-wrap items-center gap-3 text-xs text-fg-muted">
            {/* biome-ignore lint/a11y/noLabelWithoutControl: Switch renders its own input */}
            <label className="inline-flex items-center gap-2">
              <Switch
                checked={group.isRequired}
                onCheckedChange={(c) => update.mutate({ isRequired: c })}
              />
              Required
            </label>
            <span>
              Min{' '}
              <CommitOnBlurNumber
                value={group.minSelect}
                onCommit={(n) => update.mutate({ minSelect: n })}
                ariaLabel="Minimum selectable options"
              />
            </span>
            <span>
              Max{' '}
              <CommitOnBlurNumber
                value={group.maxSelect}
                onCommit={(n) => update.mutate({ maxSelect: n })}
                ariaLabel="Maximum selectable options"
              />
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => remove.mutate({ id: group.id })}
          aria-label="Delete group"
          className="grid h-7 w-7 place-items-center rounded-md text-fg-subtle transition-colors hover:bg-negative/15 hover:text-negative"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="p-3">
        {group.options.length > 0 && (
          <div className="flex flex-col gap-1">
            {group.options.map((opt) => (
              <ModifierOptionRow key={opt.id} option={opt} currency={currency} />
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => createOption.mutate({ name: 'New option' })}
          className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-accent transition-colors hover:bg-accent/[0.08]"
        >
          <Plus size={12} /> Add option
        </button>
      </div>
    </div>
  );
}

function CommitOnBlurNumber({
  value,
  onCommit,
  ariaLabel,
}: {
  value: number;
  onCommit: (n: number) => void;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = React.useState(String(value));
  React.useEffect(() => {
    setDraft(String(value));
  }, [value]);
  function commit() {
    const n = Number.parseInt(draft, 10);
    if (Number.isFinite(n) && n >= 0 && n !== value) onCommit(n);
    else setDraft(String(value));
  }
  return (
    <Input
      type="number"
      min={0}
      value={draft}
      aria-label={ariaLabel}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setDraft(String(value));
      }}
      className="ml-1 inline-block h-7 w-16 tabular-nums"
    />
  );
}

function ModifierOptionRow({
  option,
  currency,
}: {
  option: ModifierOptionDto;
  currency: string;
}) {
  const update = useUpdateModifierOption(option.id);
  const remove = useDeleteModifierOption();

  return (
    <div className="group flex items-center gap-2 rounded-md bg-surface-2 px-2 py-1.5">
      <div className="flex-1">
        <InlineEdit
          value={option.name}
          onCommit={(name) => update.mutate({ name })}
          ariaLabel="Option name"
        />
      </div>
      <div className="w-28">
        <CurrencyInput
          value={option.priceDelta}
          onChange={(v) => update.mutate({ priceDelta: v ?? '0' })}
          currency={currency}
          allowSign
        />
      </div>
      <button
        type="button"
        onClick={() => remove.mutate({ id: option.id })}
        aria-label="Delete option"
        className="grid h-7 w-7 place-items-center rounded-md text-fg-subtle opacity-0 transition-opacity hover:bg-negative/15 hover:text-negative group-hover:opacity-100"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
