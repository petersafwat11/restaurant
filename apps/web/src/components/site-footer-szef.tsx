'use client';

import { Logo } from '@/components/logo';
import { mockHours, mockLocation } from '@/lib/mock/szef-donald';
import { HoursTable, SiteFooter } from '@repo/ui';
import { Facebook, Instagram } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

/**
 * Brand-bound SiteFooter — Szef Donald copy and the operating hours pulled
 * from the local mock. Wraps the theme-agnostic `<SiteFooter>` primitive.
 */
export function SzefSiteFooter() {
  const t = useTranslations('web.footer');
  const tCommon = useTranslations('common');
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
          <div className="flex items-center gap-3">
            <Link
              href="#"
              aria-label={t('social.instagram')}
              className="text-surface/60 transition-colors hover:text-accent"
            >
              <Instagram size={20} strokeWidth={1.5} />
            </Link>
            <Link
              href="#"
              aria-label={t('social.facebook')}
              className="text-surface/60 transition-colors hover:text-accent"
            >
              <Facebook size={20} strokeWidth={1.5} />
            </Link>
          </div>
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
              <div className="flex flex-col leading-relaxed text-surface/80">
                <span className="font-semibold text-surface">{mockLocation.address1}</span>
                <span>{mockLocation.address2}</span>
              </div>
              <Link
                href={`tel:${mockLocation.phone.replace(/\s/g, '')}`}
                className="hover:text-accent"
              >
                {mockLocation.phone}
              </Link>
              <div className="mt-2 text-surface/80">
                <HoursTable
                  hours={mockHours}
                  layout="compact"
                  highlightToday={false}
                  dayLabels={dayLabels}
                  closedLabel={closedLabel}
                />
              </div>
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
          { href: '#', label: t('bottom.legal.privacy') },
          { href: '#', label: t('bottom.legal.terms') },
          { href: '#', label: t('bottom.legal.cookies') },
        ],
      }}
    />
  );
}
