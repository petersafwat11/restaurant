'use client';

import { useCreatePromotion } from '@/features/promotions/hooks';
import { PROMOTION_TYPES, type PromotionType } from '@repo/types';
import { ActionModal, Input, Label } from '@repo/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePromotionModal({ open, onOpenChange }: Props) {
  const t = useTranslations('admin.promotions.list');
  const create = useCreatePromotion();
  const { reset: resetCreate } = create;
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState<PromotionType>('PERCENT');

  React.useEffect(() => {
    if (!open) {
      setName('');
      setType('PERCENT');
      resetCreate();
    }
  }, [open, resetCreate]);

  function submit() {
    if (name.trim().length === 0) return;
    create.mutate(
      { name: name.trim(), type, isActive: false },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <ActionModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('create.title')}
      description={t('create.description')}
      primary={{
        label: create.isPending ? t('create.submitting') : t('create.submit'),
        onClick: submit,
        disabled: name.trim().length === 0 || create.isPending,
        loading: create.isPending,
      }}
      secondary={{ label: t('create.cancel'), onClick: () => onOpenChange(false) }}
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="new-promo-name">{t('create.name')}</Label>
          <Input
            id="new-promo-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('create.namePlaceholder')}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="new-promo-type">{t('create.type')}</Label>
          <select
            id="new-promo-type"
            value={type}
            onChange={(e) => setType(e.target.value as PromotionType)}
            className="h-9 w-full rounded-md border-hairline-strong bg-surface px-2 text-sm text-fg"
          >
            {PROMOTION_TYPES.map((tp) => (
              <option key={tp} value={tp}>
                {t(`types.${tp}`)}
              </option>
            ))}
          </select>
        </div>
        {create.error && <div className="text-xs text-negative">{create.error.message}</div>}
      </div>
    </ActionModal>
  );
}
