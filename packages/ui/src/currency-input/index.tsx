'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export type CurrencyValue = string | number | null;

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: CurrencyValue;
  onChange: (next: string | null) => void;
  currency?: string;
  min?: number;
  max?: number;
  step?: number;
  /** Allow a leading "+" sign for deltas (e.g. price modifiers). */
  allowSign?: boolean;
}

function currencySymbol(currency: string): string {
  switch (currency.toUpperCase()) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'PLN':
      return 'zł';
    default:
      return `${currency} `;
  }
}

/**
 * Decimal-friendly currency input. Stores its draft as a string so users can
 * type freely without floating-point rounding mid-edit; on blur it normalizes
 * to 2-decimal and emits a stringified `Decimal` (the format the backend
 * expects per `MoneyStringSchema` in `@repo/types/order.ts`).
 *
 * Pass `allowSign` for modifier-price inputs where a leading `+` is meaningful.
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput(
    { value, onChange, currency = 'USD', min, max, allowSign, className, disabled, ...rest },
    ref,
  ) {
    const symbol = currencySymbol(currency);

    const formatExternal = React.useCallback(
      (v: CurrencyValue): string => {
        if (v === null || v === undefined || v === '') return '';
        const s = typeof v === 'number' ? String(v) : v;
        if (allowSign && Number(s) > 0 && !s.startsWith('+')) return `+${s}`;
        return s;
      },
      [allowSign],
    );

    const [text, setText] = React.useState<string>(() => formatExternal(value));

    // Re-sync when the external value changes but the input isn't focused.
    React.useEffect(() => {
      if (typeof document !== 'undefined' && document.activeElement !== inputRef.current) {
        setText(formatExternal(value));
      }
    }, [value, formatExternal]);

    const inputRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    function commit() {
      const trimmed = text.trim();
      if (trimmed === '' || trimmed === '-' || trimmed === '+') {
        onChange(null);
        setText('');
        return;
      }
      let n = Number(trimmed.replace(/[+]/g, ''));
      if (Number.isNaN(n)) {
        setText(formatExternal(value));
        return;
      }
      if (min !== undefined && n < min) n = min;
      if (max !== undefined && n > max) n = max;
      n = Math.round(n * 100) / 100;
      const normalized = n.toFixed(2);
      const withSign = allowSign && n > 0 ? `+${normalized}` : normalized;
      setText(withSign);
      onChange(normalized);
    }

    return (
      <div
        className={cn(
          'flex h-9 items-stretch rounded-md border-hairline-strong bg-surface focus-within:border-accent focus-within:ring-1 focus-within:ring-accent',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        <span className="grid w-8 shrink-0 place-items-center border-r-hairline text-sm text-fg-subtle">
          {symbol}
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value.replace(/[^-+0-9.]/g, ''))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
          }}
          placeholder="0.00"
          className="flex-1 bg-transparent px-3 text-sm tabular-nums text-fg outline-none placeholder:text-fg-subtle"
          {...rest}
        />
      </div>
    );
  },
);
