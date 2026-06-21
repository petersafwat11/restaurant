'use client';

import { Logo } from '@/components/logo';
import { useRestaurant } from '@/features/restaurants/hooks';
import { todayStatus } from '@/features/restaurants/lib/restaurant-info';
import { useTranslations } from 'next-intl';
import * as React from 'react';

/**
 * Client island for the hero's floating badges. The "open now / closes at"
 * line and the location line are driven by live restaurant settings (DB) via
 * `useRestaurant()` — no hardcoded hours or city. Rendered as the `decoration`
 * slot of the server-rendered <Hero>.
 */
export function HeroLiveBadges() {
  const t = useTranslations('web.marketing.home.hero');
  const { data: restaurant } = useRestaurant();
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const status = now ? todayStatus(restaurant?.hours, now) : null;
  const city = restaurant?.address.city ?? '';

  return (
    <>
      <div className="absolute -left-4 -top-4 flex items-center gap-2 rounded-card bg-surface-elevated px-3 py-2 shadow-md">
        <span className="relative grid h-2 w-2 place-items-center">
          <span
            className={`absolute inset-0 animate-ping rounded-full opacity-60 ${
              status?.isOpen === false ? 'bg-fg-subtle' : 'bg-positive'
            }`}
          />
          <span
            className={`relative h-2 w-2 rounded-full ${
              status?.isOpen === false ? 'bg-fg-subtle' : 'bg-positive'
            }`}
          />
        </span>
        <div className="leading-tight">
          <div className="text-small font-semibold text-fg">
            {status?.isOpen === false ? t('closed') : t('openNow')}
          </div>
          {status?.closesAt && status.isOpen && (
            <div className="text-[12px] text-fg-subtle">
              {t('closesAt', { time: status.closesAt })}
            </div>
          )}
        </div>
      </div>
      <div className="absolute -bottom-4 -right-4 flex items-center gap-2 rounded-card bg-surface-elevated px-3 py-2 shadow-md">
        <Logo variant="mark" size={32} />
        <div className="leading-tight">
          <div className="font-display text-small font-medium text-fg">{t('chefName')}</div>
          {city && <div className="text-[12px] text-fg-subtle">{city}</div>}
        </div>
      </div>
    </>
  );
}
