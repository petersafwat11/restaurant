'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface SettingsAnchorNavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface SettingsAnchorNavProps {
  items: SettingsAnchorNavItem[];
  activeId?: string;
  onActiveChange?: (id: string) => void;
  scrollContainer?: React.RefObject<HTMLElement | null>;
  /**
   * When true, renders as a horizontal scrollable tab strip below `xl` and a
   * vertical rail at `xl`+ — so on tablet/phone it sits as a compact strip
   * above the content instead of a full-width stacked button list.
   */
  responsive?: boolean;
  className?: string;
}

/**
 * Sticky left-rail anchor nav for two-pane settings/profile pages. Mirrors the
 * SectionedDrawerBody pattern but lives at full page width, not inside a
 * drawer. Scroll-spy via IntersectionObserver — observes elements with `id`
 * matching each item.
 */
export function SettingsAnchorNav({
  items,
  activeId: controlledActive,
  onActiveChange,
  scrollContainer,
  responsive = false,
  className,
}: SettingsAnchorNavProps) {
  const [internalActive, setInternalActive] = React.useState<string>(
    items[0]?.id ?? '',
  );
  const active = controlledActive ?? internalActive;

  React.useEffect(() => {
    const root = scrollContainer?.current ?? null;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const id = visible.target.id;
          setInternalActive(id);
          onActiveChange?.(id);
        }
      },
      { root, rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.5, 1] },
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items, scrollContainer, onActiveChange]);

  function jumpTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setInternalActive(id);
    onActiveChange?.(id);
  }

  return (
    <nav
      aria-label="Settings sections"
      className={cn(
        'gap-1',
        responsive
          ? 'flex overflow-x-auto pb-1 xl:flex-col xl:overflow-visible xl:pb-0'
          : 'flex flex-col',
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            disabled={item.disabled}
            onClick={() => jumpTo(item.id)}
            className={cn(
              'group flex items-center gap-3 rounded-button px-3 py-2 text-left text-small font-medium transition-colors',
              // In responsive mode each item is a non-shrinking pill in the
              // horizontal strip until `xl`, then a full-width rail row.
              responsive && 'shrink-0 whitespace-nowrap xl:w-full',
              isActive
                ? 'bg-accent-muted text-fg'
                : 'text-fg-muted hover:bg-surface-warm/30 hover:text-fg',
              item.disabled && 'cursor-not-allowed opacity-50',
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.icon && (
              <span className="shrink-0 text-fg-subtle group-hover:text-fg-muted">
                {item.icon}
              </span>
            )}
            <span className={cn('truncate', responsive ? 'xl:flex-1' : 'flex-1')}>
              {item.label}
            </span>
            {item.badge && <span className="shrink-0">{item.badge}</span>}
          </button>
        );
      })}
    </nav>
  );
}
