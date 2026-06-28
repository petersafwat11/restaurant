import type { ReactNode } from 'react';

/**
 * A single document section. `id` is the `<h2 id>` anchor target; `pl`/`en` are
 * the heading labels. Keeping both locales on one object is what guarantees the
 * Polish and English section structure stays identical — the page renders the
 * heading from this list and the TOC links to the same `id`. Polish is the
 * authoritative source; English is the parallel convenience translation.
 */
export interface LegalSection {
  id: string;
  pl: string;
  en: string;
}

/** Resolve a section's heading for the active locale. */
export function sectionLabel(section: LegalSection, locale: string): string {
  return locale === 'pl' ? section.pl : section.en;
}

/**
 * On-page table of contents for a legal/policy page. Renders anchor links to
 * each section's `id`. Server component (the links are plain in-page anchors, so
 * they work without JS and appear in the crawler's initial HTML). `<Prose>`
 * gives `<h2>` a `scroll-mt` so the jump lands below the sticky header.
 */
export function LegalTableOfContents({
  heading,
  sections,
  locale,
}: {
  heading: string;
  sections: readonly LegalSection[];
  locale: string;
}): ReactNode {
  return (
    <nav
      aria-label={heading}
      className="mb-10 rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated p-6 print:hidden"
    >
      <p className="mb-3 text-small font-semibold uppercase tracking-wide text-fg-subtle">
        {heading}
      </p>
      {/* Plain list (no list-style / left padding) so it reads as a nav, not a
          numbered document list — overrides the <Prose> [&_ul] defaults. */}
      <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 !list-none !pl-0 text-small sm:grid-cols-2">
        {sections.map((section) => (
          <li key={section.id} className="!leading-snug">
            <a href={`#${section.id}`} className="text-accent underline-offset-2 hover:underline">
              {sectionLabel(section, locale)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
