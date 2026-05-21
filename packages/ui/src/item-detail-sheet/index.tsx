'use client';

import { ShoppingBag, X } from 'lucide-react';
import * as React from 'react';
import { formatMoney } from '@repo/utils';
import { Sheet, SheetContent, SheetTitle } from '../_shadcn/sheet';
import { ModifierGroup, type ModifierGroupShape } from '../modifier-group';
import { QuantityStepper } from '../quantity-stepper';
import { cn } from '../lib/cn';
import {
  DISH_FLAG_CLASSES,
  DISH_FLAG_TOKENS,
  type DishFlag,
} from '../tokens/dish-flags';
import { Flame, Leaf, Sparkles, WheatOff } from 'lucide-react';

const FLAG_ICONS = {
  leaf: Leaf,
  'wheat-off': WheatOff,
  flame: Flame,
  sparkles: Sparkles,
} as const;

export interface DishDetail {
  id: string;
  name: string;
  description?: string;
  longDescription?: string;
  /** MoneyString. */
  basePrice: string;
  currency: string;
  image: { src: string; alt: string };
  /** Optional secondary images for a small thumbnail strip. */
  images?: { src: string; alt: string }[];
  category?: string;
  prepMinutes?: number;
  calories?: number;
  flags?: DishFlag[];
  allergens?: string[];
  modifierGroups?: ModifierGroupShape[];
  unavailable?: boolean;
}

export interface NewCartLine {
  itemId: string;
  name: string;
  image?: string;
  /** MoneyString (resolved unit price after modifier deltas). */
  unitPrice: string;
  quantity: number;
  /** Flat list — feature layer adapts to CartItemDto.modifierSnapshot shape. */
  modifiers: {
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    priceDelta: string;
  }[];
  notes?: string;
}

export interface ItemDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: DishDetail | null;
  onAddToCart: (line: NewCartLine) => void;
  /** Localizable labels. */
  labels?: {
    /** Aria-label for the close (X) button. Defaults to "Close". */
    closeAriaLabel?: string;
    /** Header above the allergen chips. Defaults to "Allergens". */
    allergensLabel?: React.ReactNode;
    /** Label above the special-instructions textarea. Defaults to "Special instructions". */
    specialInstructionsLabel?: React.ReactNode;
    /**
     * Placeholder for the special-instructions textarea. Defaults to
     * "Anything we should know? (no onions, extra sauce…)".
     */
    specialInstructionsPlaceholder?: string;
    /** Label above the quantity stepper. Defaults to "Quantity". */
    quantityLabel?: React.ReactNode;
    /** Header above the total/CTA row. Defaults to "Total". */
    totalLabel?: React.ReactNode;
    /** Title shown when the item is sold out. Defaults to "Sold out today — back tomorrow.". */
    soldOut?: string;
    /** Label for the add-to-cart CTA. Defaults to "Add to cart". */
    addToCart?: React.ReactNode;
    /**
     * Build the "Please choose at least X." validation message. Receives `min`.
     * Default mirrors English wording with "one" when min===1.
     */
    formatMinChoice?: (min: number) => string;
    /**
     * Build the title-attribute hint when required groups are unfilled.
     * Receives the names of the unfilled groups. Default: `Choose: ${names.join(', ')}`.
     */
    formatChoose?: (groupNames: string[]) => string;
  };
  /**
   * Optional translated chip labels per flag. Falls back to the hardcoded
   * English label from `DISH_FLAG_TOKENS` when a flag isn't provided.
   */
  flagLabels?: Partial<Record<DishFlag, string>>;
}

function FlagChip({
  flag,
  label,
}: {
  flag: DishFlag;
  label?: string;
}) {
  const meta = DISH_FLAG_TOKENS[flag];
  const Icon = FLAG_ICONS[meta.icon];
  const text = label ?? meta.label;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium',
        DISH_FLAG_CLASSES[meta.token],
      )}
    >
      <Icon size={11} strokeWidth={2} />
      {text}
    </span>
  );
}

function defaultModifierState(item: DishDetail | null): Record<string, string[]> {
  if (!item?.modifierGroups) return {};
  const state: Record<string, string[]> = {};
  for (const g of item.modifierGroups) {
    state[g.id] = g.options.filter((o) => o.default).map((o) => o.id);
  }
  return state;
}

function computeUnitPrice(item: DishDetail, mods: Record<string, string[]>): string {
  let total = parseFloat(item.basePrice);
  for (const g of item.modifierGroups ?? []) {
    for (const optId of mods[g.id] ?? []) {
      const opt = g.options.find((o) => o.id === optId);
      if (opt) total += parseFloat(opt.priceDelta);
    }
  }
  return total.toFixed(2);
}

export function ItemDetailSheet({
  open,
  onOpenChange,
  item,
  onAddToCart,
  labels,
  flagLabels,
}: ItemDetailSheetProps) {
  const {
    closeAriaLabel = 'Close',
    allergensLabel = 'Allergens',
    specialInstructionsLabel = 'Special instructions',
    specialInstructionsPlaceholder = 'Anything we should know? (no onions, extra sauce…)',
    quantityLabel = 'Quantity',
    totalLabel = 'Total',
    soldOut = 'Sold out today — back tomorrow.',
    addToCart = 'Add to cart',
    formatMinChoice,
    formatChoose,
  } = labels ?? {};
  const [modState, setModState] = React.useState<Record<string, string[]>>(() =>
    defaultModifierState(item),
  );
  const [qty, setQty] = React.useState(1);
  const [notes, setNotes] = React.useState('');
  const [showErrors, setShowErrors] = React.useState(false);

  // Reset when the item changes / sheet reopens.
  React.useEffect(() => {
    if (open && item) {
      setModState(defaultModifierState(item));
      setQty(1);
      setNotes('');
      setShowErrors(false);
    }
  }, [open, item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!item) return null;

  const unitPrice = computeUnitPrice(item, modState);
  const total = (parseFloat(unitPrice) * qty).toFixed(2);

  const unfilled = (item.modifierGroups ?? []).filter(
    (g) => g.required && (modState[g.id] ?? []).length < g.min,
  );
  const canAdd = unfilled.length === 0 && !item.unavailable;

  const handleAdd = () => {
    if (!canAdd) {
      setShowErrors(true);
      return;
    }
    const mods: NewCartLine['modifiers'] = [];
    for (const g of item.modifierGroups ?? []) {
      for (const optId of modState[g.id] ?? []) {
        const opt = g.options.find((o) => o.id === optId);
        if (opt)
          mods.push({
            groupId: g.id,
            groupName: g.name,
            optionId: opt.id,
            optionName: opt.name,
            priceDelta: opt.priceDelta,
          });
      }
    }
    onAddToCart({
      itemId: item.id,
      name: item.name,
      image: item.image.src,
      unitPrice,
      quantity: qty,
      modifiers: mods,
      notes: notes.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
          side="right"
          hideCloseButton
          className="!w-[560px] !max-w-full !bg-surface !border-l-0 flex flex-col gap-0 p-0 shadow-lg"
        >
          <div className="flex h-16 shrink-0 items-center justify-end px-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label={closeAriaLabel}
              className="grid h-9 w-9 place-items-center rounded-full text-fg transition-colors hover:bg-surface-warm/40"
            >
              <X size={20} strokeWidth={1.75} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-b-card bg-surface-warm/40">
              {item.image.src && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={item.image.src} alt={item.image.alt} className="h-full w-full object-cover" />
              )}
            </div>

            <div className="flex flex-col gap-6 p-6">
              <div className="flex flex-col gap-2">
                {item.flags && item.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.flags.map((f) => (
                      <FlagChip key={f} flag={f} label={flagLabels?.[f]} />
                    ))}
                  </div>
                )}
                <SheetTitle asChild>
                  <h2 className="font-display text-h2 text-fg">{item.name}</h2>
                </SheetTitle>
                <div className="flex flex-wrap items-center gap-1.5 text-small text-fg-subtle">
                  {item.category && <span className="capitalize">{item.category}</span>}
                  {item.prepMinutes != null && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{item.prepMinutes} min</span>
                    </>
                  )}
                  {item.calories != null && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{item.calories} kcal</span>
                    </>
                  )}
                </div>
                <div className="font-display text-price font-medium tabular-nums text-fg">
                  {formatMoney(unitPrice, item.currency)}
                </div>
                {item.longDescription && (
                  <p className="m-0 text-body-l text-fg-muted">{item.longDescription}</p>
                )}
              </div>

              {item.allergens && item.allergens.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-caption uppercase tracking-wide text-fg-subtle">
                    {allergensLabel}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {item.allergens.map((a) => (
                      <span
                        key={a}
                        className="inline-flex items-center rounded-md bg-surface-warm/60 px-2 py-1 text-[11px] text-fg-muted"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(item.modifierGroups ?? []).map((g) => {
                const v = modState[g.id] ?? [];
                const showErr = showErrors && g.required && v.length < g.min;
                return (
                  <ModifierGroup
                    key={g.id}
                    group={g}
                    value={v}
                    onChange={(next) => setModState((s) => ({ ...s, [g.id]: next }))}
                    error={
                      showErr
                        ? formatMinChoice
                          ? formatMinChoice(g.min)
                          : `Please choose at least ${g.min === 1 ? 'one' : g.min}.`
                        : undefined
                    }
                    currency={item.currency}
                  />
                );
              })}

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="ids-notes"
                  className="text-caption uppercase tracking-wide text-fg-subtle"
                >
                  {specialInstructionsLabel}
                </label>
                <textarea
                  id="ids-notes"
                  rows={3}
                  maxLength={200}
                  placeholder={specialInstructionsPlaceholder}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 p-3 text-small text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                />
                <div className="self-end text-[11px] text-fg-subtle">{notes.length}/200</div>
              </div>

              <div className="flex flex-col items-start gap-2">
                <label className="text-caption uppercase tracking-wide text-fg-subtle">
                  {quantityLabel}
                </label>
                <QuantityStepper value={qty} onChange={setQty} size="lg" />
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-border/[var(--border-alpha)] bg-surface-2 px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-caption uppercase tracking-wide text-fg-subtle">{totalLabel}</span>
                <span className="font-display text-h3 font-medium tabular-nums text-fg">
                  {formatMoney(total, item.currency)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleAdd}
                disabled={item.unavailable}
                title={
                  item.unavailable
                    ? soldOut
                    : unfilled.length
                      ? formatChoose
                        ? formatChoose(unfilled.map((g) => g.name))
                        : `Choose: ${unfilled.map((g) => g.name).join(', ')}`
                      : undefined
                }
                className={cn(
                  'inline-flex h-14 items-center gap-2 rounded-button px-6 text-[15px] font-medium text-text-on-accent transition-colors',
                  canAdd
                    ? 'bg-accent hover:bg-accent-hover'
                    : 'cursor-not-allowed bg-accent/40',
                )}
              >
                {addToCart}
                <ShoppingBag size={18} />
              </button>
            </div>
          </div>
        </SheetContent>
    </Sheet>
  );
}
