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

const SORT_LABEL: Record<SortKey, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  'total-desc': 'Highest total',
  'wait-desc': 'Longest wait',
};

interface OrdersFiltersProps {
  value: OrdersFiltersState;
  onChange: (next: OrdersFiltersState) => void;
  counts: Record<StatusFilter, number>;
  searchRef?: React.Ref<HTMLInputElement>;
}

/**
 * Filter row + sort dropdown for the Orders page. Status pills are the
 * primary filter (keyboard 1–8); type/payment are multi-select popovers;
 * search is debounced upstream.
 */
export function OrdersFilters({ value, onChange, counts, searchRef }: OrdersFiltersProps) {
  function set<K extends keyof OrdersFiltersState>(key: K, next: OrdersFiltersState[K]) {
    onChange({ ...value, [key]: next });
  }

  const statusOptions = React.useMemo(
    () => [
      { id: 'all' as const, label: 'All', count: counts.all },
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
        label: STATUS_TOKENS[s].label,
        count: counts[s] ?? 0,
        dot: true,
        dotClassName: STATUS_TOKENS[s].bg,
      })),
    ],
    [counts],
  );

  return (
    <>
      <FilterPillGroup<StatusFilter>
        value={value.status}
        onChange={(v) => set('status', v)}
        options={statusOptions}
        ariaLabel="Status"
      />

      <div className="flex flex-1 items-center gap-2">
        <MultiSelect
          label="Type"
          options={['DELIVERY', 'PICKUP', 'DINE_IN']}
          labels={{ DELIVERY: 'Delivery', PICKUP: 'Pickup', DINE_IN: 'Dine-in' }}
          value={value.types}
          onChange={(v) => set('types', v as OrderType[])}
        />
        <MultiSelect
          label="Payment"
          options={['PAID', 'PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED']}
          labels={{
            PAID: 'Paid',
            PENDING: 'Pending',
            REFUNDED: 'Refunded',
            PARTIALLY_REFUNDED: 'Partial',
            FAILED: 'Failed',
          }}
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
            placeholder="Search order #, customer…"
            className="h-8 pl-8"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border-hairline-strong bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle">
            /
          </kbd>
        </div>

        <Select value={value.sort} onValueChange={(v) => set('sort', v as SortKey)}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="Sort">{SORT_LABEL[value.sort]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
              <SelectItem key={k} value={k}>
                {SORT_LABEL[k]}
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
