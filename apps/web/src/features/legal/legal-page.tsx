import { Container, Prose } from '@repo/ui';
import * as React from 'react';

export interface LegalPageProps {
  eyebrow: string;
  title: string;
  /** Pre-formatted "Last updated …" string. */
  lastUpdated?: string;
  /** Render-prop footer (e.g. a "Questions? Contact us" line with a Link). */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Shared layout for legal / policy pages — a centered reading column with the
 * `<Prose>` typography. See design-assets/web/legal/spec.md.
 */
export function LegalPage({ eyebrow, title, lastUpdated, footer, children }: LegalPageProps) {
  return (
    <section className="bg-bg py-section-y-mobile sm:py-section-y">
      <Container>
        <div className="mx-auto max-w-[760px]">
          <p className="text-eyebrow uppercase text-accent">{eyebrow}</p>
          <h1 className="mt-2 font-display text-h1 text-fg sm:text-hero">{title}</h1>
          {lastUpdated && <p className="mt-3 text-small text-fg-subtle">{lastUpdated}</p>}
          <div className="my-6 h-px bg-border/[var(--border-alpha)]" />
          <Prose>{children}</Prose>
          {footer && (
            <>
              <div className="my-8 h-px bg-border/[var(--border-alpha)]" />
              <div className="text-body text-fg-muted">{footer}</div>
            </>
          )}
        </div>
      </Container>
    </section>
  );
}
