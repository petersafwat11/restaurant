import { Container, EmptyState } from '@repo/ui';
import { CalendarClock } from 'lucide-react';

export default function ReservationsLandingPage() {
  return (
    <section className="bg-bg py-section-y-mobile sm:py-section-y">
      <Container size="narrow">
        <EmptyState
          size="lg"
          icon={<CalendarClock size={64} strokeWidth={1.25} />}
          title="Reservations are coming soon"
          description="For now, call us at +48 22 555 01 23 to book a table — or order takeaway."
          action={{ label: 'Browse menu', href: '/menu' }}
        />
      </Container>
    </section>
  );
}
