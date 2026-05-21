import { Link } from '@/i18n/navigation';
import { Container } from '@repo/ui';
import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function LandingStory() {
  const t = await getTranslations('web.marketing.home.story');
  return (
    <section
      id="about"
      aria-labelledby="story-h"
      className="bg-bg py-section-y-mobile sm:py-section-y"
    >
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[3fr_2fr] lg:gap-16">
          <div className="flex flex-col gap-5">
            <span className="text-eyebrow uppercase text-accent">{t('eyebrow')}</span>
            <h2
              id="story-h"
              className="font-display text-h2 text-fg sm:text-h1"
              style={{ textWrap: 'balance' as React.CSSProperties['textWrap'] }}
            >
              {t('titleLine1')}
              <br />
              {t('titleLine2')}
            </h2>
            <p className="text-body-l text-fg">{t('lead')}</p>
            <p className="text-body-l text-fg-muted">{t('body')}</p>
            <Link
              href="/about"
              className="mt-2 inline-flex items-center gap-1.5 text-[15px] font-medium text-fg transition-colors hover:text-accent"
            >
              <span className="border-b border-fg/0 transition-colors hover:border-accent">
                {t('readMore')}
              </span>
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] w-full overflow-hidden rounded-image-lg bg-surface-warm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&w=1100&q=85"
                alt={t('imageAlt')}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 flex flex-col gap-3 rounded-card bg-surface-elevated p-4 shadow-md">
              <div>
                <div className="font-display text-[28px] font-medium text-fg">
                  {t('yearsValue', { years: 11 })}
                </div>
                <div className="text-small text-fg-subtle">{t('yearsLabel', { since: 2014 })}</div>
              </div>
              <div className="h-px bg-border/[var(--border-alpha)]" />
              <div>
                <div className="font-display text-[28px] font-medium text-fg">
                  {t('wrapsValue', { count: '1,200' })}
                </div>
                <div className="text-small text-fg-subtle">{t('wrapsLabel')}</div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
