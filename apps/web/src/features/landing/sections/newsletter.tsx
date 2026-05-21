'use client';

import { Container, NewsletterForm, SectionHeader } from '@repo/ui';

export function LandingNewsletter() {
  return (
    <section
      id="newsletter"
      aria-labelledby="nl-h"
      className="bg-surface-warm py-section-y-mobile sm:py-section-y"
    >
      <Container>
        <SectionHeader
          id="nl-h"
          eyebrow="Stay in touch"
          title="Get a free baklava on your first order."
          description="Join the list — occasional emails, never spam. Unsubscribe whenever."
          align="center"
        />
        <NewsletterForm
          onSubmit={async () => {
            await new Promise((r) => setTimeout(r, 600));
          }}
        />
      </Container>
    </section>
  );
}
