'use client';

import { Logo } from '@/components/logo';
import { useRestaurant } from '@/features/restaurants/hooks';
import { formatAddressLine2, hoursToRows } from '@/features/restaurants/lib/restaurant-info';
import { HoursTable, SiteFooter } from '@repo/ui';
import { Facebook, Globe, Instagram } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

/** Pick an icon + accessible label for a social/profile URL (from `sameAs`). */
function socialMeta(url: string): { Icon: typeof Instagram; label: string } {
  const u = url.toLowerCase();
  if (u.includes('instagram')) return { Icon: Instagram, label: 'Instagram' };
  if (u.includes('facebook') || u.includes('fb.com')) return { Icon: Facebook, label: 'Facebook' };
  try {
    return { Icon: Globe, label: new URL(url).hostname.replace(/^www\./, '') };
  } catch {
    return { Icon: Globe, label: 'Website' };
  }
}

/**
 * Brand-bound SiteFooter — Szef Donald copy. Address, phone, operating hours
 * and social links are pulled live from the restaurant settings in the DB (via
 * `useRestaurant()` — social links come from the `sameAs` field, set in admin),
 * not from static mock data. Wraps the theme-agnostic `<SiteFooter>` primitive.
 */
export function SzefSiteFooter() {
  const t = useTranslations('web.footer');
  const tCommon = useTranslations('common');
  const { data: restaurant } = useRestaurant();
  const dayLabels = [
    tCommon('daysShort.sunday'),
    tCommon('daysShort.monday'),
    tCommon('daysShort.tuesday'),
    tCommon('daysShort.wednesday'),
    tCommon('daysShort.thursday'),
    tCommon('daysShort.friday'),
    tCommon('daysShort.saturday'),
  ];
  const closedLabel = tCommon('closed');
  return (
    <SiteFooter
      brandSlot={
        <div className="flex flex-col gap-4">
          <Logo variant="inverse" size={40} />
          <p className="text-body text-surface/80">{t('tagline')}</p>
          {restaurant?.sameAs && restaurant.sameAs.length > 0 && (
            <div className="flex items-center gap-3">
              {restaurant.sameAs.map((url) => {
                const { Icon, label } = socialMeta(url);
                return (
                  <Link
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="text-surface/60 transition-colors hover:text-accent"
                  >
                    <Icon size={20} strokeWidth={1.5} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      }
      columns={[
        {
          heading: t('columns.menu.heading'),
          body: (
            <>
              <Link href="/menu#kebab" className="hover:text-accent">
                {t('columns.menu.kebab')}
              </Link>
              <Link href="/menu#falafel" className="hover:text-accent">
                {t('columns.menu.falafel')}
              </Link>
              <Link href="/menu#tacos" className="hover:text-accent">
                {t('columns.menu.tacos')}
              </Link>
              <Link href="/menu#box" className="hover:text-accent">
                {t('columns.menu.boxAndPlates')}
              </Link>
              <Link href="/menu#drinks" className="hover:text-accent">
                {t('columns.menu.drinks')}
              </Link>
              <Link href="/menu" className="text-accent hover:underline">
                {t('columns.menu.viewFullMenu')}
              </Link>
            </>
          ),
        },
        {
          heading: t('columns.visit.heading'),
          body: (
            <>
              {restaurant && (
                <div className="flex flex-col leading-relaxed text-surface/80">
                  <span className="font-semibold text-surface">{restaurant.address.line1}</span>
                  <span>{formatAddressLine2(restaurant.address)}</span>
                </div>
              )}
              {restaurant?.phone && (
                <Link
                  href={`tel:${restaurant.phone.replace(/\s/g, '')}`}
                  className="hover:text-accent"
                >
                  {restaurant.phone}
                </Link>
              )}
              {restaurant?.hours && restaurant.hours.length > 0 && (
                <div className="mt-2 text-surface/80">
                  <HoursTable
                    hours={hoursToRows(restaurant.hours)}
                    layout="compact"
                    highlightToday={false}
                    dayLabels={dayLabels}
                    closedLabel={closedLabel}
                  />
                </div>
              )}
            </>
          ),
        },
        {
          heading: t('columns.company.heading'),
          body: (
            <>
              <Link href="/about" className="hover:text-accent">
                {t('columns.company.about')}
              </Link>
              <Link href="/contact" className="hover:text-accent">
                {t('columns.company.contact')}
              </Link>
              <Link href="/account/loyalty" className="hover:text-accent">
                {t('columns.company.loyalty')}
              </Link>
              <Link href="/account/referrals" className="hover:text-accent">
                {t('columns.company.referrals')}
              </Link>
            </>
          ),
        },
      ]}
      bottom={{
        copyright: t('bottom.copyright'),
        legal: [
          { href: '/privacy', label: t('bottom.legal.privacy') },
          { href: '/terms', label: t('bottom.legal.terms') },
          { href: '/cookies', label: t('bottom.legal.cookies') },
        ],
      }}
    />
  );
}
