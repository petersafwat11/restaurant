import { EmptyState } from '@repo/ui';
import { CalendarClock } from 'lucide-react';

export default function MyReservationsPage() {
  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-h2 text-fg">My reservations</h1>
        <p className="mt-1 text-small text-fg-muted">Tables you've booked.</p>
      </header>
      <EmptyState
        size="lg"
        icon={<CalendarClock size={56} strokeWidth={1.25} />}
        title="Reservations are coming soon"
        description="Booking opens in a future release. For now, call us at +48 22 555 01 23."
      />
    </section>
  );
}
