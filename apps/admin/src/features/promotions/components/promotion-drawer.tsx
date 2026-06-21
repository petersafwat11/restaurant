'use client';

import { usePermissions } from '@/features/auth/hooks/use-permissions';
import {
  useArchivePromotion,
  useCreatePromotion,
  useDeletePromotion,
  useUpdatePromotion,
} from '@/features/promotions/hooks';
import {
  PROMOTION_TYPES,
  type CreatePromotionDto,
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
import { useTranslations } from 'next-intl';
import * as React from 'react';

interface Props {
  promotion: PromotionDto | null;
  creating: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
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
  code: string;
  maxRedemptions: string;
  perUserLimit: string;
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

function emptyDraft(): Draft {
  return {
    name: '',
    description: '',
    type: 'PERCENT',
    value: '',
    minSubtotal: '',
    startsAt: '',
    endsAt: '',
    isActive: true,
    code: '',
    maxRedemptions: '',
    perUserLimit: '',
  };
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
    code: p.code ?? '',
    maxRedemptions: p.maxRedemptions === null ? '' : String(p.maxRedemptions),
    perUserLimit: p.perUserLimit === null ? '' : String(p.perUserLimit),
  };
}

export function PromotionDrawer({ promotion, creating, onOpenChange, onCreated }: Props) {
  const t = useTranslations('admin.promotions.detail');
  const tList = useTranslations('admin.promotions.list');
  const { has } = usePermissions();
  const canWrite = has('promotion:write');
  const create = useCreatePromotion();
  const update = useUpdatePromotion(promotion?.id ?? '');
  const remove = useDeletePromotion();
  const archive = useArchivePromotion();
  const canArchive = has('promotion:archive');

  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-seed draft only on identity change, not after save mutation rewrites the cached object
  React.useEffect(() => {
    if (creating) setDraft(emptyDraft());
    else if (promotion) setDraft(draftFromPromotion(promotion));
    else setDraft(null);
  }, [creating, promotion?.id]);

  const open = creating || promotion !== null;

  function buildPayload(): CreatePromotionDto | null {
    if (!draft) return null;
    const name = draft.name.trim();
    if (name.length === 0) return null;
    const value =
      draft.type === 'FREE_DELIVERY' || draft.type === 'BOGO'
        ? null
        : draft.value
          ? draft.value
          : null;
    const code = draft.code.trim().toUpperCase();
    return {
      name,
      description: draft.description || null,
      type: draft.type,
      value,
      minSubtotal: draft.minSubtotal || null,
      startsAt: fromLocalInput(draft.startsAt),
      endsAt: fromLocalInput(draft.endsAt),
      isActive: draft.isActive,
      code: code.length > 0 ? code : null,
      maxRedemptions: draft.maxRedemptions ? Number(draft.maxRedemptions) : null,
      perUserLimit: draft.perUserLimit ? Number(draft.perUserLimit) : null,
    };
  }

  function save() {
    const payload = buildPayload();
    if (!payload) return;
    if (creating) {
      create.mutate(payload, {
        onSuccess: (created) => onCreated(created.id),
      });
    } else if (promotion) {
      update.mutate(payload as UpdatePromotionDto);
    }
  }

  function updateField<K extends keyof Draft>(key: K, v: Draft[K]) {
    setDraft((d) => (d ? { ...d, [key]: v } : d));
  }

  const saving = creating ? create.isPending : update.isPending;
  const saveDisabled = !canWrite || saving || !draft || draft.name.trim().length === 0;
  const headerTitle = creating ? t('newTitle') : promotion?.name ?? '';

  return (
    <>
      <DetailDrawer
        open={open}
        onOpenChange={onOpenChange}
        width={620}
        ariaLabel={t('ariaLabel')}
        flushBody
        header={
          draft && (
            <div className="px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-h2-admin text-fg">{headerTitle}</h2>
                <span
                  className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] ${
                    draft.isActive
                      ? 'bg-positive/[0.12] text-positive'
                      : 'bg-fg-subtle/[0.12] text-fg-muted'
                  }`}
                >
                  {draft.isActive ? t('active') : t('paused')}
                </span>
              </div>
              <div className="mt-1 text-xs text-fg-muted">{tList(`types.${draft.type}`)}</div>
            </div>
          )
        }
        footer={
          draft && (
            <div className="flex w-full items-center gap-2">
              {canWrite && !creating && promotion && (
                <Button
                  variant="ghost"
                  className="text-negative hover:text-negative"
                  onClick={() => setConfirmDelete(true)}
                >
                  {t('actions.delete')}
                </Button>
              )}
              {canArchive && !creating && promotion && (
                <Button
                  variant="ghost"
                  disabled={archive.isPending}
                  onClick={() =>
                    archive.mutate({ id: promotion.id, archive: !promotion.isArchived })
                  }
                >
                  {promotion.isArchived ? t('actions.restore') : t('actions.archive')}
                </Button>
              )}
              <Button
                variant="primary"
                className="ml-auto"
                disabled={saveDisabled}
                onClick={save}
              >
                {saving
                  ? creating
                    ? t('actions.creating')
                    : t('actions.saving')
                  : creating
                    ? t('actions.create')
                    : t('actions.save')}
              </Button>
            </div>
          )
        }
      >
        {draft && (
          <SectionedDrawerBody
            sections={[
              {
                id: 'overview',
                label: t('sections.overview'),
                icon: Tag,
                children: (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="promo-name">{t('fields.name')}</Label>
                      <Input
                        id="promo-name"
                        autoFocus={creating}
                        value={draft.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        placeholder={t('fields.namePlaceholder')}
                        disabled={!canWrite}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="promo-desc">{t('fields.description')}</Label>
                      <Textarea
                        id="promo-desc"
                        value={draft.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        rows={3}
                        disabled={!canWrite}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-md border-hairline bg-surface-2 px-3 py-2">
                      <span className="text-sm text-fg">{t('fields.active')}</span>
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
                label: t('sections.typeValue'),
                icon: Settings,
                children: (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="promo-type">{t('fields.type')}</Label>
                      <select
                        id="promo-type"
                        value={draft.type}
                        onChange={(e) => updateField('type', e.target.value as PromotionType)}
                        disabled={!canWrite}
                        className="h-9 w-full rounded-md border-hairline-strong bg-surface px-2 text-sm text-fg"
                      >
                        {PROMOTION_TYPES.map((tp) => (
                          <option key={tp} value={tp}>
                            {tList(`types.${tp}`)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {draft.type === 'PERCENT' && (
                      <div className="space-y-1">
                        <Label htmlFor="promo-value-pct">{t('fields.percentValue')}</Label>
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
                        <Label htmlFor="promo-value-fixed">{t('fields.amountValue')}</Label>
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
                        {t('hints.bogo')}
                      </div>
                    )}
                    {draft.type === 'FREE_DELIVERY' && (
                      <div className="rounded-md border-hairline bg-surface-2 p-3 text-xs text-fg-muted">
                        {t('hints.freeDelivery')}
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label htmlFor="promo-min">{t('fields.minSubtotal')}</Label>
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
                label: t('sections.schedule'),
                icon: CalendarRange,
                children: (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="promo-starts">{t('fields.startsAt')}</Label>
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
                      <Label htmlFor="promo-ends">{t('fields.endsAt')}</Label>
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
                id: 'coupon',
                label: t('sections.coupon'),
                icon: Ticket,
                children: (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="promo-code">{t('coupon.code')}</Label>
                      <Input
                        id="promo-code"
                        value={draft.code}
                        onChange={(e) =>
                          updateField(
                            'code',
                            e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
                          )
                        }
                        placeholder={t('coupon.codePlaceholder')}
                        className="font-mono text-sm"
                        disabled={!canWrite}
                      />
                      <p className="text-xs text-fg-subtle">{t('coupon.codeHint')}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="promo-max">{t('coupon.maxRedemptions')}</Label>
                        <Input
                          id="promo-max"
                          type="number"
                          min={0}
                          value={draft.maxRedemptions}
                          onChange={(e) => updateField('maxRedemptions', e.target.value)}
                          placeholder={t('coupon.unlimited')}
                          disabled={!canWrite}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="promo-peruser">{t('coupon.perUserLimit')}</Label>
                        <Input
                          id="promo-peruser"
                          type="number"
                          min={0}
                          value={draft.perUserLimit}
                          onChange={(e) => updateField('perUserLimit', e.target.value)}
                          placeholder={t('coupon.unlimited')}
                          disabled={!canWrite}
                        />
                      </div>
                    </div>
                    {!creating && promotion && (
                      <div className="rounded-md border-hairline bg-surface-2 px-3 py-2 text-xs text-fg-muted">
                        {t('coupon.used', { count: promotion.redemptionsCount })}
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </DetailDrawer>

      <ActionModal
        open={confirmDelete && !!promotion}
        onOpenChange={setConfirmDelete}
        title={t('confirmDelete.title')}
        description={t('confirmDelete.description')}
        variant="destructive"
        primary={{
          label: remove.isPending ? t('confirmDelete.deleting') : t('confirmDelete.delete'),
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
        secondary={{ label: t('confirmDelete.cancel'), onClick: () => setConfirmDelete(false) }}
      />
    </>
  );
}
