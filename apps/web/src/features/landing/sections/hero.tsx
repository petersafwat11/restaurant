import { dishImageAlt } from '@/features/menu/lib/dish-facts';
import { buildSeoVars, interpolate } from '@/features/seo/seo-vars';
import { Link } from '@/i18n/navigation';
import { PYSZNE_RATING } from '@/lib/brand';
import { fetchMenuTree } from '@/lib/seo/fetch-menu';
import { fetchPublicRestaurant } from '@/lib/seo/fetch-restaurant';
import { localePath } from '@/lib/seo/site';
import { Hero, Stars } from '@repo/ui';
import { Truck } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { HeroLiveBadges } from './hero-live-badges';

export async function LandingHero() {
  const locale = await getLocale();
  const t = await getTranslations('web.marketing.home.hero');
  const tSeo = await getTranslations('web.seo.pages.common');
  const [restaurant, tree] = await Promise.all([fetchPublicRestaurant(), fetchMenuTree(locale)]);
  // Real dish photo (featured first) instead of a stock image when available.
  const heroDish =
    tree?.categories.flatMap((c) => c.items).find((i) => i.isFeatured && i.images[0]?.url) ?? null;
  const heroImage = heroDish?.images[0]?.url
    ? { src: heroDish.images[0].url, alt: dishImageAlt(heroDish, locale) }
    : {
        src: 'https://images.unsplash.com/photo-1633321702518-7feccafb94d5?auto=format&fit=crop&w=1400&q=85',
        alt: t('imageAlt'),
      };
  const vars = restaurant ? buildSeoVars(restaurant, locale) : null;

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
      description={
        <>
          {t('description')}
          {vars && (
            <>
              <br />
              <Link
                href="/dostawa"
                className="mt-3 inline-flex items-center gap-2 font-semibold text-accent hover:underline"
              >
                <Truck size={16} aria-hidden />
                {interpolate(tSeo.raw('orderDirect') as string, vars)}
              </Link>
            </>
          )}
        </>
      }
      primaryCta={{ label: t('primaryCta'), href: localePath(locale, '/menu') }}
      secondaryCta={{ label: t('secondaryCta'), href: localePath(locale, '/kebab-kielce') }}
      // Real, owner-verified rating shown WITH its source (Pyszne.pl). Never
      // emitted as aggregateRating JSON-LD for our own business.
      rating={{
        value: PYSZNE_RATING.value,
        count: 0,
        label: t('ratingLabel', { count: PYSZNE_RATING.countLabel }),
        renderStars: (v) => (
          <Stars value={v} size={16} ariaLabel={t('starsAriaLabel', { value: v })} />
        ),
      }}
      media={
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-image-lg bg-surface-warm">
          {/* The LCP element is the H1 (text), not this photo: on phones the
              photo sits below the fold, so it is not preloaded / high-priority
              (that would steal bandwidth from CSS + fonts). Eager on desktop,
              where it is beside the H1; responsive AVIF/WebP via next/image. */}
          <Image
            src={heroImage.src}
            alt={heroImage.alt}
            fill
            loading="eager"
            sizes="(max-width: 1024px) calc(100vw - 32px), 560px"
            className="object-cover"
          />
        </div>
      }
      decoration={<HeroLiveBadges />}
    />
  );
}
