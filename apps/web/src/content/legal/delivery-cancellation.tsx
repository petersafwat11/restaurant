import type { LegalSection } from '@/features/legal/legal-toc';
import { Link } from '@/i18n/navigation';
import { type HoursRow, HoursTable } from '@repo/ui';

/**
 * Delivery & Cancellation policy (plan §D5) — NEW page. Renders the restaurant's
 * CURRENT DB-backed fulfilment values (location, channels, radius, fee, minimum
 * order, ETA ranges, hours). Binding cancellation/refund rules are STRUCTURE
 * with inline LAWYER placeholders.
 *
 * The order snapshot preserves the values that applied at purchase even if these
 * admin settings later change (see OrderLegalSnapshotSchema in @repo/types) —
 * this page shows the *current* values, which is why they are read live.
 *
 * This document IS part of the accepted legal bundle (LEGAL_BUNDLE_DOCUMENTS).
 */

export const DELIVERY_SECTIONS: LegalSection[] = [
  { id: 'current', pl: '1. Aktualne warunki', en: '1. Current conditions' },
  { id: 'hours', pl: '2. Godziny otwarcia', en: '2. Operating hours' },
  { id: 'delivery', pl: '3. Dostawa', en: '3. Delivery' },
  { id: 'pickup', pl: '4. Odbiór osobisty', en: '4. Pickup' },
  { id: 'delays', pl: '5. Opóźnienia i nieudane doręczenie', en: '5. Delays & failed delivery' },
  { id: 'cancellation', pl: '6. Anulowanie zamówienia', en: '6. Cancelling an order' },
  { id: 'refunds', pl: '7. Zwroty', en: '7. Refunds' },
];

/** Current, DB-sourced fulfilment facts. Money values are pre-formatted strings. */
export interface DeliveryFacts {
  /** Trading/fulfilment address lines (from the restaurant record). */
  addressLines: string[];
  channels: { delivery: boolean; pickup: boolean; dineIn: boolean };
  deliveryRadiusKm: number;
  /** Pre-formatted via formatMoney() — never recompute money on the client. */
  deliveryFee: string;
  minOrder: string;
  /** Pre-formatted ETA range labels like "30–45" (minutes); null if not set. */
  deliveryEta: string | null;
  pickupEta: string | null;
  /** Operating-hours rows for <HoursTable>; null when hours aren't configured. */
  hours: HoursRow[] | null;
  /** Localized day labels + "closed" label for <HoursTable>. */
  dayLabels: string[];
  closedLabel: string;
}

export function DeliveryEN({ f }: { f: DeliveryFacts }) {
  const channelList = [
    f.channels.delivery ? 'delivery' : null,
    f.channels.pickup ? 'pickup' : null,
    f.channels.dineIn ? 'dine-in' : null,
  ].filter(Boolean);
  return (
    <>
      <p>
        This policy explains how delivery and pickup work, what happens with delays or failed
        delivery, and how to cancel an order. It works together with our{' '}
        <Link href="/terms">Terms</Link> and{' '}
        <Link href="/refunds-complaints">Refunds &amp; Complaints Policy</Link>. The values below
        are the current settings; the values that applied to a specific order are recorded with that
        order.
      </p>

      <h2 id="current">1. Current conditions</h2>
      <table>
        <tbody>
          <tr>
            <th>Trading location</th>
            <td>{f.addressLines.join(', ')}</td>
          </tr>
          <tr>
            <th>Order channels</th>
            <td>{channelList.length > 0 ? channelList.join(', ') : '—'}</td>
          </tr>
          <tr>
            <th>Delivery area</th>
            <td>Within ~{f.deliveryRadiusKm} km of the trading location</td>
          </tr>
          <tr>
            <th>Delivery fee</th>
            <td>{f.deliveryFee}</td>
          </tr>
          <tr>
            <th>Minimum order</th>
            <td>{f.minOrder}</td>
          </tr>
          <tr>
            <th>Estimated delivery time</th>
            <td>{f.deliveryEta != null ? `~${f.deliveryEta} minutes` : '—'}</td>
          </tr>
          <tr>
            <th>Estimated pickup time</th>
            <td>{f.pickupEta != null ? `~${f.pickupEta} minutes` : '—'}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-fg-subtle">
        The delivery area is checked against the pin you place on the map at checkout. Estimated
        times are indicative, not guaranteed.
      </p>

      <h2 id="hours">2. Operating hours</h2>
      {f.hours ? (
        <div className="my-4 max-w-sm">
          <HoursTable
            hours={f.hours}
            layout="list"
            highlightToday={false}
            dayLabels={f.dayLabels}
            closedLabel={f.closedLabel}
          />
        </div>
      ) : (
        <p>Current opening hours are shown on our website and on our contact page.</p>
      )}
      <p>
        Orders can only be placed and prepared during opening hours. Public-holiday exceptions, if
        any, are shown on the site. {/* LAWYER/OWNER: confirm holiday-exception handling. */}
      </p>

      <h2 id="delivery">3. Delivery</h2>
      <p>
        Please give a complete, accurate address and a reachable phone number so the courier can
        reach you. We deliver within the area shown at checkout.
      </p>

      <h2 id="pickup">4. Pickup</h2>
      <p>
        For pickup, we’ll tell you when your order is ready. Please collect it promptly so it stays
        fresh. {/* LAWYER/OWNER: confirm how long a prepared pickup order is held. */}
      </p>

      <h2 id="delays">5. Delays &amp; failed delivery</h2>
      <p>
        Traffic, weather and high demand can affect timing. If the courier cannot reach you — for
        example a wrong address or no answer on the phone — we will try to contact you.{' '}
        {/* LAWYER: state who bears the risk/cost of a failed delivery caused by an incorrect address
        or the customer being unavailable, consistent with mandatory consumer rules. */}
      </p>

      <h2 id="cancellation">6. Cancelling an order</h2>
      <p>
        To request a cancellation, contact us as soon as possible with your order number via{' '}
        <Link href="/contact">/contact</Link> or the channels in our{' '}
        <Link href="/refunds-complaints">Refunds &amp; Complaints Policy</Link>.{' '}
        {/* LAWYER: state the cancellation cutoff — e.g. once preparation has started or the order is
        out for delivery, cancellation may no longer be possible — and how a prepaid cancellation is
        routed through the refund workflow (plan §C4/§D5). */}
      </p>

      <h2 id="refunds">7. Refunds</h2>
      <p>
        Where a prepaid order is cancelled or could not be delivered through no fault of yours, any
        refund is handled through our{' '}
        <Link href="/refunds-complaints">Refunds &amp; Complaints Policy</Link>.
      </p>
    </>
  );
}

export function DeliveryPL({ f }: { f: DeliveryFacts }) {
  const channelList = [
    f.channels.delivery ? 'dostawa' : null,
    f.channels.pickup ? 'odbiór osobisty' : null,
    f.channels.dineIn ? 'na miejscu' : null,
  ].filter(Boolean);
  return (
    <>
      <p>
        Ta polityka wyjaśnia, jak działa dostawa i odbiór, co dzieje się przy opóźnieniach lub
        nieudanym doręczeniu oraz jak anulować zamówienie. Obowiązuje wraz z naszym{' '}
        <Link href="/terms">Regulaminem</Link> i{' '}
        <Link href="/refunds-complaints">Polityką zwrotów i reklamacji</Link>. Poniższe wartości to
        aktualne ustawienia; wartości obowiązujące dla konkretnego zamówienia są zapisywane wraz z
        tym zamówieniem.
      </p>

      <h2 id="current">1. Aktualne warunki</h2>
      <table>
        <tbody>
          <tr>
            <th>Miejsce prowadzenia działalności</th>
            <td>{f.addressLines.join(', ')}</td>
          </tr>
          <tr>
            <th>Kanały zamawiania</th>
            <td>{channelList.length > 0 ? channelList.join(', ') : '—'}</td>
          </tr>
          <tr>
            <th>Obszar dostawy</th>
            <td>W promieniu ok. {f.deliveryRadiusKm} km od miejsca działalności</td>
          </tr>
          <tr>
            <th>Opłata za dostawę</th>
            <td>{f.deliveryFee}</td>
          </tr>
          <tr>
            <th>Minimalna wartość zamówienia</th>
            <td>{f.minOrder}</td>
          </tr>
          <tr>
            <th>Szacowany czas dostawy</th>
            <td>{f.deliveryEta != null ? `ok. ${f.deliveryEta} min` : '—'}</td>
          </tr>
          <tr>
            <th>Szacowany czas odbioru</th>
            <td>{f.pickupEta != null ? `ok. ${f.pickupEta} min` : '—'}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-fg-subtle">
        Obszar dostawy sprawdzany jest względem pinezki ustawionej na mapie przy zamawianiu.
        Szacowane czasy mają charakter orientacyjny i nie są gwarantowane.
      </p>

      <h2 id="hours">2. Godziny otwarcia</h2>
      {f.hours ? (
        <div className="my-4 max-w-sm">
          <HoursTable
            hours={f.hours}
            layout="list"
            highlightToday={false}
            dayLabels={f.dayLabels}
            closedLabel={f.closedLabel}
          />
        </div>
      ) : (
        <p>Aktualne godziny otwarcia są pokazane na naszej stronie i na stronie kontaktu.</p>
      )}
      <p>
        Zamówienia można składać i przygotowywać wyłącznie w godzinach otwarcia. Ewentualne wyjątki
        świąteczne są pokazane na stronie.{' '}
        {/* LAWYER/OWNER: potwierdź obsługę wyjątków świątecznych. */}
      </p>

      <h2 id="delivery">3. Dostawa</h2>
      <p>
        Prosimy o podanie kompletnego, prawidłowego adresu i dostępnego numeru telefonu, aby kurier
        mógł się z Tobą skontaktować. Dostarczamy w obszarze pokazanym przy zamawianiu.
      </p>

      <h2 id="pickup">4. Odbiór osobisty</h2>
      <p>
        Przy odbiorze poinformujemy, gdy zamówienie będzie gotowe. Prosimy o sprawny odbiór, aby
        danie pozostało świeże.{' '}
        {/* LAWYER/OWNER: potwierdź, jak długo przechowujemy gotowe
        zamówienie do odbioru. */}
      </p>

      <h2 id="delays">5. Opóźnienia i nieudane doręczenie</h2>
      <p>
        Ruch drogowy, pogoda i duże obłożenie mogą wpływać na czas. Jeśli kurier nie może Cię zastać
        — np. błędny adres lub brak odpowiedzi pod telefonem — spróbujemy się z Tobą skontaktować.{' '}
        {/* LAWYER: wskaż, kto ponosi ryzyko/koszt nieudanego doręczenia z powodu błędnego adresu lub
        niedostępności klienta, zgodnie z bezwzględnie obowiązującymi przepisami konsumenckimi. */}
      </p>

      <h2 id="cancellation">6. Anulowanie zamówienia</h2>
      <p>
        Aby poprosić o anulowanie, skontaktuj się z nami jak najszybciej, podając numer zamówienia,
        przez <Link href="/contact">/contact</Link> lub kanały wskazane w{' '}
        <Link href="/refunds-complaints">Polityce zwrotów i reklamacji</Link>.{' '}
        {/* LAWYER: wskaż moment graniczny anulowania — np. po rozpoczęciu przygotowania lub wydaniu
        do dostawy anulowanie może być niemożliwe — oraz jak anulowanie przedpłaconego zamówienia
        przebiega przez proces zwrotu (plan §C4/§D5). */}
      </p>

      <h2 id="refunds">7. Zwroty</h2>
      <p>
        Gdy przedpłacone zamówienie zostaje anulowane lub nie mogło zostać doręczone nie z Twojej
        winy, ewentualny zwrot obsługujemy zgodnie z{' '}
        <Link href="/refunds-complaints">Polityką zwrotów i reklamacji</Link>.
      </p>
    </>
  );
}
