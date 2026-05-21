'use client';

import { usePermissions } from '@/features/auth/hooks/use-permissions';
import {
  useArchivePromotion,
  useDeletePromotion,
  useUpdatePromotion,
} from '@/features/promotions/hooks';
import {
  PROMOTION_TYPES,
  type PromotionDto,
  type PromotionType,
  type UpdatePromotionDto,
} from '@repo/types';
import {
  ActionModal,
  Button,
  CurrencyInput,
  DetailDrawer,
  Input,
  Label,
  SectionedDrawerBody,
  Switch,
  Textarea,
} from '@repo/ui';
import { CalendarRange, Settings, Tag, Ticket } from 'lucide-react';
import * as React from 'react';
import { PromotionCoupons } from './promotion-coupons';

interface Props {
  promotion: PromotionDto | null;
  onOpenChange: (open: boolean) => void;
}

type Draft = {
  name: string;
  description: string;
  type: PromotionType;
  value: string;
  minSubtotal: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string | null {
  if (!local) return null;
  return new Date(local).toISOString();
}

function draftFromPromotion(p: PromotionDto): Draft {
  return {
    name: p.name,
    description: p.description ?? '',
    type: p.type,
    value: p.value ?? '',
    minSubtotal: p.minSubtotal ?? '',
    startsAt: toLocalInput(p.startsAt),
    endsAt: toLocalInput(p.endsAt),
    isActive: p.isActive,
  };
}

export function PromotionDrawer({ promotion, onOpenChange }: Props) {
  const { has } = usePermissions();
  const canWrite = has('promotion:write');
  const update = useUpdatePromotion(promotion?.id ?? '');
  const remove = useDeletePromotion();
  const archive = useArchivePromotion();
  const canArchive = has('promotion:archive');

  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-seed draft only on promotion change, not after save mutation rewrites the cached object
  React.useEffect(() => {
    setDraft(promotion ? draftFromPromotion(promotion) : null);
  }, [promotion?.id]);

  const open = promotion !== null;

  function save() {
    if (!promotion || !draft) return;
    const input: UpdatePromotionDto = {
      name: draft.name,
      description: draft.description || null,
      type: draft.type,
      value:
        draft.type === 'FREE_DELIVERY' || draft.type === 'BOGO'
          ? null
          : draft.value
            ? draft.value
            : null,
      minSubtotal: draft.minSubtotal || null,
      startsAt: fromLocalInput(draft.startsAt),
      endsAt: fromLocalInput(draft.endsAt),
      isActive: draft.isActive,
    };
    update.mutate(input);
  }

  function updateField<K extends keyof Draft>(key: K, v: Draft[K]) {
    setDraft((d) => (d ? { ...d, [key]: v } : d));
  }

  return (
    <>
      <DetailDrawer
        open={open}
        onOpenChange={onOpenChange}
        width={620}
        ariaLabel="Promotion editor"
        flushBody
        header={
          promotion &&
          draft && (
            <div className="px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-h2-admin text-fg">{promotion.name}</h2>
                <span
                  className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] ${
                    draft.isActive
                      ? 'bg-positive/[0.12] text-positive'
                      : 'bg-fg-subtle/[0.12] text-fg-muted'
                  }`}
                >
                  {draft.isActive ? 'Active' : 'Paused'}
                </span>
              </div>
              <div className="mt-1 text-xs text-fg-muted">{promotion.type}</div>
            </div>
          )
        }
        footer={
          promotion &&
          draft && (
            <div className="flex w-full items-center gap-2">
              {canWrite && (
                <Button
                  variant="ghost"
                  className="text-negative hover:text-negative"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </Button>
              )}
              {canArchive && (
                <Button
                  variant="ghost"
                  disabled={archive.isPending}
                  onClick={() =>
                    archive.mutate({ id: promotion.id, archive: !promotion.isArchived })
                  }
                >
                  {promotion.isArchived ? 'Restore' : 'Archive'}
                </Button>
              )}
              <Button
                variant="primary"
                className="ml-auto"
                disabled={!canWrite || update.isPending}
                onClick={save}
              >
                {update.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          )
        }
      >
        {promotion && draft && (
          <SectionedDrawerBody
            sections={[
              {
                id: 'overview',
                label: 'Overview',
                icon: Tag,
                children: (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="promo-name">Name</Label>
                      <Input
                        id="promo-name"
                        value={draft.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        disabled={!canWrite}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="promo-desc">Description</Label>
                      <Textarea
                        id="promo-desc"
                        value={draft.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        rows={3}
                        disabled={!canWrite}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-md border-hairline bg-surface-2 px-3 py-2">
                      <span className="text-sm text-fg">Active</span>
                      <Switch
                        checked={draft.isActive}
                        onCheckedChange={(v) => updateField('isActive', v)}
                        disabled={!canWrite}
                      />
                    </div>
                  </div>
                ),
              },
              {
                id: 'type',
                label: 'Type & value',
                icon: Settings,
                children: (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="promo-type">Type</Label>
                      <select
                        id="promo-type"
                        value={draft.type}
                        onChange={(e) => updateField('type', e.target.value as PromotionType)}
                        disabled={!canWrite}
                        className="h-9 w-full rounded-md border-hairline-strong bg-surface px-2 text-sm text-fg"
                      >
                        {PROMOTION_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    {draft.type === 'PERCENT' && (
                      <div className="space-y-1">
                        <Label htmlFor="promo-value-pct">Percent off (0–100)</Label>
                        <Input
                          id="promo-value-pct"
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          value={draft.value}
                          onChange={(e) => updateField('value', e.target.value)}
                          disabled={!canWrite}
                        />
                      </div>
                    )}
                    {draft.type === 'FIXED' && (
                      <div className="space-y-1">
                        <Label htmlFor="promo-value-fixed">Amount off</Label>
                        <CurrencyInput
                          id="promo-value-fixed"
                          value={draft.value || null}
                          onChange={(v) => updateField('value', v ?? '')}
                          disabled={!canWrite}
                        />
                      </div>
                    )}
                    {draft.type === 'BOGO' && (
                      <div className="rounded-md border-hairline bg-surface-2 p-3 text-xs text-fg-muted">
                        BOGO promotions don't take a value here. Eligibility is configured per
                        coupon (v1).
                      </div>
                    )}
                    {draft.type === 'FREE_DELIVERY' && (
                      <div className="rounded-md border-hairline bg-surface-2 p-3 text-xs text-fg-muted">
                        Free delivery has no extra inputs.
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label htmlFor="promo-min">Minimum cart subtotal</Label>
                      <CurrencyInput
                        id="promo-min"
                        value={draft.minSubtotal || null}
                        onChange={(v) => updateField('minSubtotal', v ?? '')}
                        disabled={!canWrite}
                      />
                    </div>
                  </div>
                ),
              },
              {
                id: 'window',
                label: 'Schedule',
                icon: CalendarRange,
                children: (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="promo-starts">Starts</Label>
                      <input
                        id="promo-starts"
                        type="datetime-local"
                        value={draft.startsAt}
                        onChange={(e) => updateField('startsAt', e.target.value)}
                        disabled={!canWrite}
                        className="h-9 w-full rounded-md border-hairline-strong bg-surface px-2 text-sm text-fg"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="promo-ends">Ends</Label>
                      <input
                        id="promo-ends"
                        type="datetime-local"
                        value={draft.endsAt}
                        onChange={(e) => updateField('endsAt', e.target.value)}
                        disabled={!canWrite}
                        className="h-9 w-full rounded-md border-hairline-strong bg-surface px-2 text-sm text-fg"
                      />
                    </div>
                  </div>
                ),
              },
              {
                id: 'coupons',
                label: 'Coupons',
                icon: Ticket,
                children: <PromotionCoupons promotionId={promotion.id} />,
              },
            ]}
          />
        )}
      </DetailDrawer>

      <ActionModal
        open={confirmDelete && !!promotion}
        onOpenChange={setConfirmDelete}
        title="Delete promotion?"
        description="This removes the promotion and all its coupons. Active redemptions are preserved in order history."
        variant="destructive"
        primary={{
          label: remove.isPending ? 'Deleting…' : 'Delete',
          onClick: () => {
            if (!promotion) return;
            remove.mutate(
              { id: promotion.id },
              {
                onSuccess: () => {
                  setConfirmDelete(false);
                  onOpenChange(false);
                },
              },
            );
          },
          loading: remove.isPending,
        }}
        secondary={{ label: 'Cancel', onClick: () => setConfirmDelete(false) }}
      />
    </>
  );
}
