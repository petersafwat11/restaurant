'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface MenuSubNavSection {
  id: string;
  label: string;
  count?: number;
}

export interface MenuSubNavProps {
  sections: MenuSubNavSection[];
  activeId: string;
  onSelect: (id: string) => void;
  variant?: 'pill' | 'underline';
  className?: string;
  ariaLabel?: string;
}

/**
 * Sticky pill nav for the menu page categories. Active pill scrolls itself
 * into view on the horizontal scroll-snap row (mobile).
 *
 * Scroll-spy lives at the feature layer (`useScrollSpy`) so this primitive
 * stays pure presentational.
 */
export function MenuSubNav({
  sections,
  activeId,
  onSelect,
  variant = 'pill',
  className,
  ariaLabel = 'Menu categories',
}: MenuSubNavProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);

  // When activeId changes (via scroll-spy), scroll the active pill into view.
  React.useEffect(() => {
    const el = wrapRef.current?.querySelector<HTMLElement>(`[data-pill="${activeId}"]`);
    if (el) {
      el.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
    }
  }, [activeId]);

  return (
    <div
      ref={wrapRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'flex items-center gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {sections.map((s) => {
        const active = s.id === activeId;
        return (
          <button
            key={s.id}
            type="button"
            role="tab"
            data-pill={s.id}
            aria-selected={active}
            onClick={() => onSelect(s.id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[15px] font-medium transition-colors duration-web-color',
              variant === 'pill'
                ? cn(
                    'h-10',
                    active
                      ? 'bg-accent/[0.10] text-fg'
                      : 'text-fg-muted hover:bg-surface-warm/40 hover:text-fg',
                  )
                : cn(
                    'h-10 px-2',
                    active
                      ? 'border-b-2 border-accent text-fg'
                      : 'border-b-2 border-transparent text-fg-muted hover:text-fg',
                  ),
            )}
          >
            <span>{s.label}</span>
            {s.count != null && (
              <span className="text-small text-fg-subtle">{s.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
