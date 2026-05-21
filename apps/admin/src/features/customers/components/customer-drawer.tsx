'use client';

import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { useCustomer, useUpdateCustomerNote } from '@/features/customers/hooks';
import {
  Button,
  DetailDrawer,
  RelativeTime,
  SectionedDrawerBody,
  Spinner,
  Textarea,
} from '@repo/ui';
import { formatMoney } from '@repo/utils';
import { Bookmark, Home, ListOrdered, NotebookPen, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

interface Props {
  customerId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function CustomerDrawer({ customerId, onOpenChange }: Props) {
  const t = useTranslations('admin.customers.detail');
  const tStatus = useTranslations('shared.orderStatus');
  const { has } = usePermissions();
  const q = useCustomer(customerId ?? '');
  const addNote = useUpdateCustomerNote(customerId ?? '');
  const open = customerId !== null;
  const c = q.data;
  const [noteBody, setNoteBody] = React.useState('');

  const canWriteNotes = has('customer:notes');

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      width={620}
      ariaLabel={t('ariaLabel')}
      flushBody
      header={
        c ? (
          <div className="px-6 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-h2-admin text-fg">
                  {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || t('anonymous')}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
                  <span>{c.email}</span>
                  {c.phone && (
                    <>
                      <span className="text-fg-subtle">·</span>
                      <span className="tabular-nums">{c.phone}</span>
                    </>
                  )}
                </div>
              </div>
              {c.segment && (
                <span className="inline-flex h-5 items-center rounded-full bg-accent/[0.12] px-2 text-[11px] text-accent">
                  {t(`segment.${c.segment}`)}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center px-6 py-4">
            <Spinner size="sm" tone="muted" />
          </div>
        )
      }
    >
      {q.isLoading && (
        <div className="flex items-center justify-center px-6 py-16">
          <Spinner size="lg" />
        </div>
      )}
      {c && (
        <SectionedDrawerBody
          sections={[
            {
              id: 'overview',
              label: t('sections.overview'),
              icon: User,
              children: (
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <Stat label={t('stats.lifetimeOrders')} value={String(c.lifetimeOrders)} />
                  <Stat
                    label={t('stats.lifetimeSpend')}
                    value={formatMoney(c.lifetimeSpend, c.recentOrders[0]?.currency ?? 'USD')}
                  />
                  <Stat
                    label={t('stats.firstOrder')}
                    value={
                      c.firstOrderAt ? <RelativeTime value={c.firstOrderAt} /> : t('stats.empty')
                    }
                  />
                  <Stat
                    label={t('stats.lastOrder')}
                    value={
                      c.lastOrderAt ? <RelativeTime value={c.lastOrderAt} /> : t('stats.empty')
                    }
                  />
                  <Stat label={t('stats.reviews')} value={String(c.reviewCount)} />
                  <Stat label={t('stats.joined')} value={<RelativeTime value={c.createdAt} />} />
                </dl>
              ),
            },
            {
              id: 'orders',
              label: t('sections.orders'),
              icon: ListOrdered,
              children:
                c.recentOrders.length === 0 ? (
                  <div className="text-sm text-fg-subtle">{t('orders.empty')}</div>
                ) : (
                  <ul className="divide-y divide-border/[var(--border-strong-alpha)] rounded-md border-hairline bg-surface-2">
                    {c.recentOrders.map((o) => (
                      <li
                        key={o.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                      >
                        <span className="font-mono text-fg">{o.orderNumber}</span>
                        <span className="text-xs text-fg-muted">
                          {tStatus.has(o.status) ? tStatus(o.status) : o.status}
                        </span>
                        <span className="tabular-nums text-fg">
                          {formatMoney(o.grandTotal, o.currency)}
                        </span>
                        <RelativeTime value={o.createdAt} />
                      </li>
                    ))}
                  </ul>
                ),
            },
            {
              id: 'addresses',
              label: t('sections.addresses'),
              icon: Home,
              children:
                c.addresses.length === 0 ? (
                  <div className="text-sm text-fg-subtle">{t('addresses.empty')}</div>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {c.addresses.map((a) => (
                      <li key={a.id} className="rounded-md border-hairline bg-surface-2 px-3 py-2">
                        <div className="text-fg">{a.label ?? a.line1}</div>
                        <div className="text-xs text-fg-muted">
                          {a.line1}, {a.city}
                        </div>
                      </li>
                    ))}
                  </ul>
                ),
            },
            {
              id: 'payment',
              label: t('sections.payment'),
              icon: Bookmark,
              children:
                c.paymentMethods.length === 0 ? (
                  <div className="text-sm text-fg-subtle">{t('payment.empty')}</div>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {c.paymentMethods.map((p) => (
                      <li key={p.id} className="text-fg-muted">
                        {p.brand ?? t('payment.cardFallback')} ···· {p.last4 ?? t('payment.last4Fallback')}
                      </li>
                    ))}
                  </ul>
                ),
            },
            {
              id: 'notes',
              label: t('sections.notes'),
              icon: NotebookPen,
              children: (
                <div className="space-y-3">
                  {c.notes.length === 0 ? (
                    <div className="text-sm text-fg-subtle">{t('notes.empty')}</div>
                  ) : (
                    <ul className="space-y-2">
                      {c.notes.map((n) => (
                        <li
                          key={n.id}
                          className="rounded-md border-hairline bg-surface-2 p-3 text-sm"
                        >
                          <div className="whitespace-pre-wrap text-fg">{n.body}</div>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-fg-subtle">
                            <span className="font-mono">{n.byUserId}</span>
                            <span>·</span>
                            <RelativeTime value={n.createdAt} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {canWriteNotes && (
                    <div className="space-y-2">
                      <Textarea
                        value={noteBody}
                        onChange={(e) => setNoteBody(e.target.value)}
                        placeholder={t('notes.placeholder')}
                        rows={3}
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={addNote.isPending || noteBody.trim().length === 0}
                        onClick={() =>
                          addNote.mutate(
                            { body: noteBody.trim() },
                            { onSuccess: () => setNoteBody('') },
                          )
                        }
                      >
                        {addNote.isPending ? t('notes.saving') : t('notes.add')}
                      </Button>
                    </div>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}
    </DetailDrawer>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-caption-admin text-fg-subtle">{label}</dt>
      <dd className="mt-0.5 text-fg">{value}</dd>
    </div>
  );
}
