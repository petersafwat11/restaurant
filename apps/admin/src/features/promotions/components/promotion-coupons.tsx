'use client';

import { usePermissions } from '@/features/auth/hooks/use-permissions';
import {
  useBulkGenerateCoupons,
  useCoupons,
  useCreateCoupon,
  useDeleteCoupon,
} from '@/features/promotions/hooks';
import type { CouponDto } from '@repo/types';
import { Button, Input } from '@repo/ui';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

interface Props {
  promotionId: string;
}

export function PromotionCoupons({ promotionId }: Props) {
  const t = useTranslations('admin.promotions.detail.coupons');
  const { has } = usePermissions();
  const q = useCoupons(promotionId);
  const create = useCreateCoupon(promotionId);
  const remove = useDeleteCoupon(promotionId);
  const bulk = useBulkGenerateCoupons(promotionId);
  const canWrite = has('promotion:write');

  const [code, setCode] = React.useState('');
  const [maxRedemptions, setMaxRedemptions] = React.useState('');
  const [perUserLimit, setPerUserLimit] = React.useState('');
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [bulkQty, setBulkQty] = React.useState('25');
  const [bulkPrefix, setBulkPrefix] = React.useState('');
  const [bulkCodeLen, setBulkCodeLen] = React.useState('8');

  const coupons = q.data ?? [];

  function submit() {
    if (code.trim().length < 2) return;
    create.mutate(
      {
        code: code.trim().toUpperCase(),
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
        perUserLimit: perUserLimit ? Number(perUserLimit) : null,
      },
      {
        onSuccess: () => {
          setCode('');
          setMaxRedemptions('');
          setPerUserLimit('');
        },
      },
    );
  }

  return (
    <div className="space-y-3">
      {coupons.length === 0 ? (
        <div className="text-sm text-fg-subtle">{t('empty')}</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-caption-admin text-fg-subtle">
            <tr>
              <th className="border-b-hairline py-2 font-medium">{t('columns.code')}</th>
              <th className="border-b-hairline py-2 font-medium">{t('columns.used')}</th>
              <th className="border-b-hairline py-2 font-medium">{t('columns.max')}</th>
              <th className="border-b-hairline py-2 font-medium">{t('columns.perUser')}</th>
              <th className="border-b-hairline py-2" />
            </tr>
          </thead>
          <tbody>
            {coupons.map((c: CouponDto) => (
              <tr key={c.id}>
                <td className="border-b-hairline py-2 font-mono text-fg">{c.code}</td>
                <td className="border-b-hairline py-2 tabular-nums text-fg-muted">
                  {c.redemptionsCount}
                </td>
                <td className="border-b-hairline py-2 tabular-nums text-fg-muted">
                  {c.maxRedemptions ?? t('unlimited')}
                </td>
                <td className="border-b-hairline py-2 tabular-nums text-fg-muted">
                  {c.perUserLimit ?? t('unlimited')}
                </td>
                <td className="border-b-hairline py-2 text-right">
                  {canWrite && (
                    <button
                      type="button"
                      onClick={() => remove.mutate({ id: c.id })}
                      className="text-fg-subtle hover:text-negative"
                      aria-label={t('deleteAriaLabel')}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canWrite && (
        <div className="flex flex-wrap items-end gap-2 rounded-md border-hairline bg-surface-2 p-3">
          <div className="flex-1 min-w-[10rem] space-y-1">
            <span className="text-caption-admin text-fg-subtle">{t('add.code')}</span>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t('add.codePlaceholder')}
              className="font-mono text-sm"
            />
          </div>
          <div className="w-24 space-y-1">
            <span className="text-caption-admin text-fg-subtle">{t('add.max')}</span>
            <Input
              type="number"
              min={0}
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
              placeholder={t('unlimited')}
            />
          </div>
          <div className="w-24 space-y-1">
            <span className="text-caption-admin text-fg-subtle">{t('add.perUser')}</span>
            <Input
              type="number"
              min={0}
              value={perUserLimit}
              onChange={(e) => setPerUserLimit(e.target.value)}
              placeholder={t('unlimited')}
            />
          </div>
          <Button
            variant="primary"
            disabled={create.isPending || code.trim().length < 2}
            onClick={submit}
          >
            {t('add.submit')}
          </Button>
          <Button variant="secondary" onClick={() => setBulkOpen((v) => !v)}>
            {t('add.bulk')}
          </Button>
        </div>
      )}

      {canWrite && bulkOpen && (
        <div className="flex flex-wrap items-end gap-2 rounded-md border-hairline bg-surface-2 p-3">
          <div className="w-24 space-y-1">
            <span className="text-caption-admin text-fg-subtle">{t('bulk.quantity')}</span>
            <Input
              type="number"
              min={1}
              max={1000}
              value={bulkQty}
              onChange={(e) => setBulkQty(e.target.value)}
            />
          </div>
          <div className="w-32 space-y-1">
            <span className="text-caption-admin text-fg-subtle">{t('bulk.prefix')}</span>
            <Input
              value={bulkPrefix}
              onChange={(e) =>
                setBulkPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))
              }
              placeholder={t('bulk.prefixPlaceholder')}
              className="font-mono text-sm"
            />
          </div>
          <div className="w-28 space-y-1">
            <span className="text-caption-admin text-fg-subtle">{t('bulk.codeLength')}</span>
            <Input
              type="number"
              min={4}
              max={24}
              value={bulkCodeLen}
              onChange={(e) => setBulkCodeLen(e.target.value)}
            />
          </div>
          <div className="w-24 space-y-1">
            <span className="text-caption-admin text-fg-subtle">{t('bulk.maxUses')}</span>
            <Input
              type="number"
              min={0}
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
              placeholder={t('unlimited')}
            />
          </div>
          <div className="w-24 space-y-1">
            <span className="text-caption-admin text-fg-subtle">{t('bulk.perUser')}</span>
            <Input
              type="number"
              min={0}
              value={perUserLimit}
              onChange={(e) => setPerUserLimit(e.target.value)}
              placeholder={t('unlimited')}
            />
          </div>
          <Button
            variant="primary"
            disabled={bulk.isPending}
            onClick={() => {
              const qty = Number(bulkQty);
              if (!qty || qty < 1) return;
              bulk.mutate(
                {
                  quantity: qty,
                  prefix: bulkPrefix || undefined,
                  codeLength: Number(bulkCodeLen) || 8,
                  maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
                  perUserLimit: perUserLimit ? Number(perUserLimit) : null,
                },
                { onSuccess: () => setBulkOpen(false) },
              );
            }}
          >
            {t('bulk.generate')}
          </Button>
        </div>
      )}
    </div>
  );
}
