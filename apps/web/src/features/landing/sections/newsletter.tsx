'use client';

import { Container, NewsletterForm, SectionHeader } from '@repo/ui';
import { useTranslations } from 'next-intl';

export function LandingNewsletter() {
  const t = useTranslations('web.marketing.home.newsletter');
  return (
    <section
      id="newsletter"
      aria-labelledby="nl-h"
      className="bg-surface-warm py-section-y-mobile sm:py-section-y"
    >
      <Container>
        <SectionHeader
          id="nl-h"
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('description')}
          align="center"
        />
        <NewsletterForm
          onSubmit={async () => {
            await new Promise((r) => setTimeout(r, 600));
          }}
          placeholder={t('emailPlaceholder')}
          ctaLabel={t('subscribe')}
          successMessage={t('subscribeSuccess')}
          errorMessage={t('subscribeError')}
          emailAriaLabel={t('emailAriaLabel')}
        />
      </Container>
    </section>
  );
}
