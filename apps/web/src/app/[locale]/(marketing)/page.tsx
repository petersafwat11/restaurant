import { LandingCategories } from '@/features/landing/sections/categories';
import { LandingFeaturedDishes } from '@/features/landing/sections/featured-dishes';
import { LandingHero } from '@/features/landing/sections/hero';
import { LandingHoursLocation } from '@/features/landing/sections/hours-location';
import { LandingNewsletter } from '@/features/landing/sections/newsletter';
import { LandingStory } from '@/features/landing/sections/story';
import { LandingTestimonials } from '@/features/landing/sections/testimonials';
import { setRequestLocale } from 'next-intl/server';

export function generateStaticParams() {
  return [{ locale: 'pl' }, { locale: 'en' }];
}

/**
 * Landing page (/) — composes 7 sections from @repo/ui primitives.
 *
 * Each section is a small server-or-client component; the page itself is a
 * server component that simply orders them.
 */
export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <LandingHero />
      <LandingCategories />
      <LandingFeaturedDishes />
      <LandingStory />
      <LandingHoursLocation />
      <LandingTestimonials />
      <LandingNewsletter />
    </>
  );
}
