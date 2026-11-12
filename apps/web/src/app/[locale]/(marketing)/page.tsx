import { ServerDataHydration } from '@/components/server-data-hydration';
import { LandingCategories } from '@/features/landing/sections/categories';
import { LandingFeaturedDishes } from '@/features/landing/sections/featured-dishes';
import { LandingHero } from '@/features/landing/sections/hero';
import { LandingHoursLocation } from '@/features/landing/sections/hours-location';
import { LandingNewsletter } from '@/features/landing/sections/newsletter';
import { LandingStory } from '@/features/landing/sections/story';
import { seoMetadata } from '@/features/seo/load-seo';
import { fetchMenuTree } from '@/lib/seo/fetch-menu';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

export async function generateMetadata({
  params,
}: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return seoMetadata(locale, 'home', '/');
}

/**
 * Landing page (/) — composes the landing sections from @repo/ui primitives.
 * The menu tree is fetched server-side and seeded into the query cache so the
 * categories and featured dishes are in the initial HTML.
 */
export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tree = await fetchMenuTree(locale);
  return (
    <ServerDataHydration menu={{ locale, tree }}>
      <LandingHero />
      <LandingCategories />
      <LandingFeaturedDishes />
      <LandingStory />
      <LandingHoursLocation />
      <LandingNewsletter />
    </ServerDataHydration>
  );
}
