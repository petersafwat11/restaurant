import * as React from 'react';
import { cn } from '../lib/cn';

export interface ProseProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Long-form reading typography for content pages (legal, policies, articles).
 * Styles descendant elements via semantic tokens so callers write plain
 * `<h2>/<p>/<ul>/<table>` and get consistent rhythm + contrast. No
 * `@tailwindcss/typography` dependency — descendant variants keep it tokenised.
 */
export function Prose({ children, className }: ProseProps) {
  return (
    <div
      className={cn(
        'max-w-none text-fg-muted',
        '[&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:scroll-mt-28 [&_h2]:font-display [&_h2]:text-h2 [&_h2]:text-fg',
        '[&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-h3 [&_h3]:font-semibold [&_h3]:text-fg',
        '[&_p]:mb-4 [&_p]:text-body [&_p]:leading-relaxed',
        '[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6',
        '[&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6',
        '[&_li]:text-body [&_li]:leading-relaxed',
        '[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent-hover',
        '[&_strong]:font-semibold [&_strong]:text-fg',
        '[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-small',
        '[&_th]:border [&_th]:border-border/[var(--border-alpha)] [&_th]:bg-surface-2 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-fg',
        '[&_td]:border [&_td]:border-border/[var(--border-alpha)] [&_td]:px-3 [&_td]:py-2 [&_td]:align-top',
        className,
      )}
    >
      {children}
    </div>
  );
}
