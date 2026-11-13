import { LandingCategories } from '@/features/landing/sections/categories';
import { LandingFeaturedDishes } from '@/features/landing/sections/featured-dishes';
import { LandingHero } from '@/features/landing/sections/hero';
import { LandingHoursLocation } from '@/features/landing/sections/hours-location';
import { LandingNewsletter } from '@/features/landing/sections/newsletter';
import { LandingStory } from '@/features/landing/sections/story';
import { seoMetadata } from '@/features/seo/load-seo';
import { fetchMenuTree } from '@/lib/seo/fetch-menu';
import { fetchPublicRestaurant } from '@/lib/seo/fetch-restaurant';
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
 * Everything except small islands (hero badges, featured quick-add buttons,
 * newsletter form) is a Server Component rendered from the server-fetched menu
 * tree and restaurant record, so the page does not ship or hydrate the menu.
 */
export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [tree, restaurant] = await Promise.all([fetchMenuTree(locale), fetchPublicRestaurant()]);
  return (
    <>
      <LandingHero />
      <LandingCategories tree={tree} />
      <LandingFeaturedDishes tree={tree} />
      {/* Off-screen on first paint: skip their layout/paint until scrolled near. */}
      <div className="cv-auto">
        <LandingStory />
      </div>
      <div className="cv-auto">
        <LandingHoursLocation restaurant={restaurant} />
      </div>
      <div className="cv-auto">
        <LandingNewsletter />
      </div>
    </>
  );
}
