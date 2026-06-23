'use client';

import { Link } from '@/i18n/navigation';
import { getApiClient } from '@/lib/api-client';
import { Container, NewsletterForm, SectionHeader } from '@repo/ui';
import { useLocale, useTranslations } from 'next-intl';

export function LandingNewsletter() {
  const t = useTranslations('web.marketing.home.newsletter');
  const locale = useLocale();
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
          onSubmit={async (email) => {
            await getApiClient().newsletter.subscribe({
              email,
              consent: true,
              locale,
              source: 'landing',
            });
          }}
          placeholder={t('emailPlaceholder')}
          ctaLabel={t('subscribe')}
          successMessage={t('subscribeSuccess')}
          errorMessage={t('subscribeError')}
          emailAriaLabel={t('emailAriaLabel')}
          consentRequiredMessage={t('consentRequired')}
          consentLabel={t.rich('consentLabel', {
            privacyLink: (chunks) => (
              <Link href="/privacy" className="text-accent underline underline-offset-2">
                {chunks}
              </Link>
            ),
          })}
        />
      </Container>
    </section>
  );
}
