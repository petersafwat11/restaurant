import { EmptyState } from '@repo/ui';
import { CalendarClock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function MyReservationsPage() {
  const t = await getTranslations('web.account.reservations');
  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-h2 text-fg">{t('title')}</h1>
        <p className="mt-1 text-small text-fg-muted">{t('subtitle')}</p>
      </header>
      <EmptyState
        size="lg"
        icon={<CalendarClock size={56} strokeWidth={1.25} />}
        title={t('empty.title')}
        description={t('empty.description', { phone: '+48 22 555 01 23' })}
      />
    </section>
  );
}
