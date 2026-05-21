'use client';

import type { LucideIcon } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export interface DrawerSection {
  id: string;
  label: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}

export interface SectionedDrawerBodyProps {
  sections: DrawerSection[];
  initialSection?: string;
  className?: string;
}

/**
 * Anchor-nav drawer body. Renders all sections inline and tracks the
 * currently-visible one with IntersectionObserver; clicking a rail entry
 * smooth-scrolls the body to that section. Used by Menu item editor and
 * Customer/Promotion detail drawers.
 *
 * Layout: `[1fr | 56px rail]`. The rail sits flush against the drawer's
 * right edge.
 *
 * Page-3 fix #2 (from `.claude/plans/admin-dashboard-port.md`): replaces
 * the flat scrollable sections in the Claude Design source with proper
 * anchor-nav + scroll-spy.
 */
export function SectionedDrawerBody({
  sections,
  initialSection,
  className,
}: SectionedDrawerBodyProps) {
  const [active, setActive] = React.useState(initialSection ?? sections[0]?.id ?? '');
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const sectionRefs = React.useRef<Map<string, HTMLElement | null>>(new Map());

  React.useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Use the top-most intersecting section
        let topId: string | null = null;
        let topY = Number.POSITIVE_INFINITY;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = (entry.target as HTMLElement).dataset.sectionId;
          if (!id) continue;
          const y = entry.boundingClientRect.top;
          if (y < topY) {
            topY = y;
            topId = id;
          }
        }
        if (topId) setActive(topId);
      },
      {
        root,
        rootMargin: '-12px 0px -75% 0px',
        threshold: 0,
      },
    );

    for (const el of sectionRefs.current.values()) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  function jumpTo(id: string) {
    const root = scrollerRef.current;
    const el = sectionRefs.current.get(id);
    if (!root || !el) return;
    const offset = el.offsetTop - 8;
    root.scrollTo({ top: offset, behavior: 'smooth' });
    setActive(id);
  }

  return (
    <div className={cn('grid h-full min-h-0', className)} style={{ gridTemplateColumns: '1fr 56px' }}>
      <div
        ref={scrollerRef}
        className="min-w-0 overflow-y-auto px-6 py-4"
      >
        {sections.map((s) => (
          <section
            key={s.id}
            ref={(el) => {
              sectionRefs.current.set(s.id, el);
            }}
            data-section-id={s.id}
            className="mb-6 scroll-mt-2"
          >
            <h3 className="mb-3 text-caption-admin text-fg-subtle">{s.label}</h3>
            {s.children}
          </section>
        ))}
      </div>
      <nav
        aria-label="Drawer sections"
        className="sticky top-0 flex h-full flex-col items-center gap-1 border-l-hairline bg-surface-2 py-4"
      >
        {sections.map((s) => {
          const Icon = s.icon;
          const isActive = s.id === active;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => jumpTo(s.id)}
              title={s.label}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'grid h-8 w-8 place-items-center rounded-md transition-colors',
                isActive
                  ? 'bg-accent/[0.12] text-accent'
                  : 'text-fg-subtle hover:bg-surface hover:text-fg-muted',
              )}
            >
              {Icon ? <Icon size={14} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
