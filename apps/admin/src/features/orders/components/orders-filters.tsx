'use client';

import type { OrderStatus, OrderType, PaymentStatus } from '@repo/types';
import {
  Checkbox,
  FilterPillGroup,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  STATUS_TOKENS,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@repo/ui';
import { ChevronDown, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

export type StatusFilter = 'all' | OrderStatus;

export interface OrdersFiltersState {
  status: StatusFilter;
  types: OrderType[];
  payments: PaymentStatus[];
  search: string;
  sort: SortKey;
}

export type SortKey = 'newest' | 'oldest' | 'total-desc' | 'wait-desc';

interface OrdersFiltersProps {
  value: OrdersFiltersState;
  onChange: (next: OrdersFiltersState) => void;
  counts: Record<StatusFilter, number>;
  searchRef?: React.Ref<HTMLInputElement>;
}

export function OrdersFilters({ value, onChange, counts, searchRef }: OrdersFiltersProps) {
  const t = useTranslations('admin.orders.list');
  const tStatus = useTranslations('shared.orderStatus');

  function set<K extends keyof OrdersFiltersState>(key: K, next: OrdersFiltersState[K]) {
    onChange({ ...value, [key]: next });
  }

  const sortLabels: Record<SortKey, string> = {
    newest: t('sort.newest'),
    oldest: t('sort.oldest'),
    'total-desc': t('sort.totalDesc'),
    'wait-desc': t('sort.waitDesc'),
  };

  const typeLabels = {
    DELIVERY: t('filters.types.DELIVERY'),
    PICKUP: t('filters.types.PICKUP'),
    DINE_IN: t('filters.types.DINE_IN'),
  };

  const paymentLabels = {
    PAID: t('filters.payments.PAID'),
    PENDING: t('filters.payments.PENDING'),
    REFUNDED: t('filters.payments.REFUNDED'),
    PARTIALLY_REFUNDED: t('filters.payments.PARTIALLY_REFUNDED'),
    FAILED: t('filters.payments.FAILED'),
  };

  const statusOptions = React.useMemo(
    () => [
      { id: 'all' as const, label: t('filters.all'), count: counts.all },
      ...(
        [
          'PENDING',
          'CONFIRMED',
          'PREPARING',
          'READY',
          'OUT_FOR_DELIVERY',
          'DELIVERED',
          'CANCELLED',
        ] as const
      ).map((s) => ({
        id: s,
        label: tStatus(s),
        count: counts[s] ?? 0,
        dot: true,
        dotClassName: STATUS_TOKENS[s].bg,
      })),
    ],
    [counts, t, tStatus],
  );

  return (
    <>
      <FilterPillGroup<StatusFilter>
        value={value.status}
        onChange={(v) => set('status', v)}
        options={statusOptions}
        ariaLabel={t('filters.statusAriaLabel')}
      />

      <div className="flex flex-1 items-center gap-2">
        <MultiSelect
          label={t('filters.typeLabel')}
          options={['DELIVERY', 'PICKUP', 'DINE_IN']}
          labels={typeLabels}
          value={value.types}
          onChange={(v) => set('types', v as OrderType[])}
        />
        <MultiSelect
          label={t('filters.paymentLabel')}
          options={['PAID', 'PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED']}
          labels={paymentLabels}
          value={value.payments}
          onChange={(v) => set('payments', v as PaymentStatus[])}
        />

        <div className="relative ml-auto w-72">
          <Search
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle"
          />
          <Input
            ref={searchRef}
            value={value.search}
            onChange={(e) => set('search', e.target.value)}
            placeholder={t('filters.searchPlaceholder')}
            className="h-8 pl-8"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border-hairline-strong bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle">
            /
          </kbd>
        </div>

        <Select value={value.sort} onValueChange={(v) => set('sort', v as SortKey)}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder={t('filters.sortPlaceholder')}>
              {sortLabels[value.sort]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(sortLabels) as SortKey[]).map((k) => (
              <SelectItem key={k} value={k}>
                {sortLabels[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

interface MultiSelectProps {
  label: string;
  options: readonly string[];
  labels: Record<string, string>;
  value: readonly string[];
  onChange: (next: string[]) => void;
}

function MultiSelect({ label, options, labels, value, onChange }: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-md border-hairline-strong bg-surface px-2.5 text-xs transition-colors hover:bg-surface-2',
            value.length > 0 ? 'text-fg' : 'text-fg-muted',
          )}
        >
          <span>{label}</span>
          {value.length > 0 && (
            <span className="rounded bg-accent/[0.15] px-1.5 text-[10px] font-medium text-accent">
              {value.length}
            </span>
          )}
          <ChevronDown size={12} className="text-fg-subtle" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1">
        {options.map((opt) => {
          const on = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(on ? value.filter((v) => v !== opt) : [...value, opt])}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface hover:text-fg"
            >
              <Checkbox checked={on} aria-hidden tabIndex={-1} />
              <span>{labels[opt] ?? opt}</span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
