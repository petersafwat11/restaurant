import { Hero, Stars } from '@repo/ui';
import { getTranslations } from 'next-intl/server';
import { HeroLiveBadges } from './hero-live-badges';

export async function LandingHero() {
  const t = await getTranslations('web.marketing.home.hero');
  return (
    <Hero
      eyebrow={t('eyebrow')}
      title={
        <>
          {t('titleLine1')}
          <br />
          <em className="font-display italic text-accent">{t('titleEmphasis')}</em>
          <br />
          {t('titleLine3')}
        </>
      }
      description={t('description')}
      primaryCta={{ label: t('primaryCta'), href: '/menu' }}
      secondaryCta={{ label: t('secondaryCta'), href: '/menu' }}
      rating={{
        value: 4.8,
        count: 1247,
        label: t('ratingLabel', { count: 1247 }),
        renderStars: (v) => (
          <Stars value={v} size={16} ariaLabel={t('starsAriaLabel', { value: v })} />
        ),
      }}
      media={
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-image-lg bg-surface-warm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1633321702518-7feccafb94d5?auto=format&fit=crop&w=1400&q=85"
            alt={t('imageAlt')}
            className="h-full w-full object-cover"
          />
        </div>
      }
      decoration={<HeroLiveBadges />}
    />
  );
}
