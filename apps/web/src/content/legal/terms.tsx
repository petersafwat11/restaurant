import type { CompanyInfo } from '@/features/legal/company';
import type { LegalSection } from '@/features/legal/legal-toc';
import { SellerIdentity } from '@/features/legal/seller-identity';
import { Link } from '@/i18n/navigation';

/**
 * Versioned source for the Terms (Regulamin). Prose relocated out of the page
 * TSX so it is version-controlled content with an identical PL/EN section list
 * (plan §D1). Polish is authoritative. DB facts (seller identity, ETA ranges)
 * are injected via typed props — never hardcoded.
 *
 * NOTE: this is the *existing, previously-shipped* Terms copy, relocated. Any
 * change to a stated right/obligation/deadline still needs lawyer review; new
 * binding statements are flagged with a `LAWYER` comment.
 */

/** Section list — drives both the heading rendering and the on-page TOC. */
export const TERMS_SECTIONS: LegalSection[] = [
  { id: 'seller', pl: '1. Sprzedawca', en: '1. Who we are (the Seller)' },
  { id: 'services', pl: '2. Usługi', en: '2. Services' },
  { id: 'orders', pl: '3. Składanie zamówienia', en: '3. Placing an order' },
  { id: 'prices', pl: '4. Ceny, VAT i opłaty', en: '4. Prices, VAT & fees' },
  { id: 'payment', pl: '5. Płatność', en: '5. Payment' },
  { id: 'delivery', pl: '6. Dostawa i odbiór', en: '6. Delivery & pickup' },
  {
    id: 'withdrawal',
    pl: '7. Prawo odstąpienia i reklamacje',
    en: '7. Right of withdrawal & complaints',
  },
  { id: 'liability', pl: '8. Odpowiedzialność', en: '8. Liability' },
  {
    id: 'disputes',
    pl: '9. Pozasądowe rozwiązywanie sporów',
    en: '9. Out-of-court dispute resolution',
  },
  { id: 'law', pl: '10. Prawo właściwe i zmiany', en: '10. Governing law & changes' },
];

/** Indicative order-ready time range (minutes); `max` null = single value. */
export interface MinsRange {
  min: number;
  max: number | null;
}

function fmtMinsRange(r: MinsRange): string {
  return r.max != null && r.max !== r.min ? `${r.min}–${r.max}` : `${r.min}`;
}

export interface TermsBodyProps {
  c: CompanyInfo;
  /** Indicative order-ready ranges (minutes); null = not configured / hidden. */
  delivery: MinsRange | null;
  pickup: MinsRange | null;
}

export function TermsEN({ c, delivery, pickup }: TermsBodyProps) {
  return (
    <>
      <p>
        These Terms (the “Regulamin”) govern the use of our website and online ordering service. By
        placing an order you accept these Terms and our <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2 id="seller">1. Who we are (the Seller)</h2>
      <SellerIdentity c={c} locale="en" />

      <h2 id="services">2. Services</h2>
      <p>
        We offer online ordering of food for delivery, pickup or dine-in. You can order as a guest
        or with an account. You must provide accurate contact and delivery details and be old enough
        to enter a contract.
      </p>

      <h2 id="orders">3. Placing an order</h2>
      <p>
        Add items to the cart, choose delivery/pickup, provide your details and pay. A binding sales
        contract is concluded when we confirm your order. Prices and availability are those shown at
        the time of ordering.
      </p>

      <h2 id="prices">4. Prices, VAT &amp; fees</h2>
      <p>
        All prices are in PLN and include VAT. Any delivery fee and minimum order value are shown
        before you confirm. The total payable is displayed on the checkout summary.
      </p>

      <h2 id="payment">5. Payment</h2>
      <p>
        We accept the payment methods shown at checkout (e.g. card, BLIK, and cash on delivery where
        available). Card payments are processed by our payment provider; we never store your full
        card details.
      </p>

      <h2 id="delivery">6. Delivery &amp; pickup</h2>
      <p>
        Delivery is available within our delivery area shown on the map at checkout. Estimated times
        are indicative. For pickup, we’ll tell you when your order is ready. For full delivery,
        cancellation and failed-delivery rules, see our{' '}
        <Link href="/delivery-cancellation">Delivery &amp; Cancellation Policy</Link>.
      </p>
      {(delivery != null || pickup != null) && (
        <p>
          {delivery != null
            ? `Typical delivery time is about ${fmtMinsRange(delivery)} minutes. `
            : ''}
          {pickup != null
            ? `Orders are usually ready for pickup in about ${fmtMinsRange(pickup)} minutes.`
            : ''}
        </p>
      )}

      <h2 id="withdrawal">7. Right of withdrawal &amp; complaints</h2>
      <p>
        Under the Polish Consumer Rights Act (art. 38), the 14-day right of withdrawal does{' '}
        <strong>not</strong> apply to prepared/perishable food or to services for a specific date
        (e.g. a table reservation). This does not affect your statutory rights if an order is
        defective: please report any problem to <a href={`mailto:${c.email}`}>{c.email}</a> as soon
        as possible (complaint / <em>reklamacja</em>) and we’ll put it right. See our{' '}
        <Link href="/refunds-complaints">Refunds &amp; Complaints Policy</Link> for the full
        process.
      </p>

      <h2 id="liability">8. Liability</h2>
      <p>
        We are liable for the proper performance of the service in accordance with the law. Allergen
        information is provided on each product; if you have a serious allergy, please also contact
        us before ordering.
      </p>

      <h2 id="disputes">9. Out-of-court dispute resolution</h2>
      <p>
        Consumers may use out-of-court complaint and redress mechanisms, including the consumer
        ombudsman (rzecznik konsumentów) and the bodies listed by the Polish Office of Competition
        and Consumer Protection (UOKiK,{' '}
        <a href="https://www.uokik.gov.pl" target="_blank" rel="noreferrer">
          uokik.gov.pl
        </a>
        ).
      </p>
      <p className="text-fg-subtle">
        Note: the EU Online Dispute Resolution (ODR) platform was closed by the European Commission
        on 20 July 2025 and is no longer available. Please use the Polish consumer routes above.
      </p>

      <h2 id="law">10. Governing law &amp; changes</h2>
      <p>
        These Terms are governed by Polish law. We may update them; the “last updated” date reflects
        the current version, and orders are governed by the Terms in force when placed.
      </p>
    </>
  );
}

export function TermsPL({ c, delivery, pickup }: TermsBodyProps) {
  return (
    <>
      <p>
        Niniejszy Regulamin określa zasady korzystania z naszej strony i usługi zamówień online.
        Składając zamówienie, akceptujesz Regulamin oraz naszą{' '}
        <Link href="/privacy">Politykę Prywatności</Link>.
      </p>

      <h2 id="seller">1. Sprzedawca</h2>
      <SellerIdentity c={c} locale="pl" />

      <h2 id="services">2. Usługi</h2>
      <p>
        Umożliwiamy zamawianie jedzenia online z dostawą, na wynos lub na miejscu. Możesz zamawiać
        jako gość lub z kontem. Podaj prawidłowe dane kontaktowe i adresowe; musisz mieć zdolność do
        zawarcia umowy.
      </p>

      <h2 id="orders">3. Składanie zamówienia</h2>
      <p>
        Dodaj produkty do koszyka, wybierz dostawę/odbiór, podaj dane i zapłać. Wiążąca umowa
        sprzedaży zostaje zawarta w chwili potwierdzenia zamówienia przez nas. Obowiązują ceny i
        dostępność z momentu składania zamówienia.
      </p>

      <h2 id="prices">4. Ceny, VAT i opłaty</h2>
      <p>
        Wszystkie ceny podane są w PLN i zawierają VAT. Ewentualna opłata za dostawę oraz minimalna
        wartość zamówienia są pokazywane przed potwierdzeniem. Łączna kwota do zapłaty widoczna jest
        w podsumowaniu zamówienia.
      </p>

      <h2 id="payment">5. Płatność</h2>
      <p>
        Akceptujemy metody płatności pokazane przy zamawianiu (np. karta, BLIK oraz płatność przy
        odbiorze, jeśli dostępna). Płatności kartą obsługuje dostawca płatności; nie przechowujemy
        pełnych danych karty.
      </p>

      <h2 id="delivery">6. Dostawa i odbiór</h2>
      <p>
        Dostawa dostępna jest w obszarze dostawy pokazanym na mapie przy zamawianiu. Szacowane czasy
        mają charakter orientacyjny. Przy odbiorze poinformujemy, gdy zamówienie będzie gotowe.
        Pełne zasady dostawy, anulowania i nieudanego doręczenia opisuje nasza{' '}
        <Link href="/delivery-cancellation">Polityka dostaw i anulowania</Link>.
      </p>
      {(delivery != null || pickup != null) && (
        <p>
          {delivery != null ? `Typowy czas dostawy to około ${fmtMinsRange(delivery)} min. ` : ''}
          {pickup != null
            ? `Zamówienia do odbioru są zwykle gotowe w około ${fmtMinsRange(pickup)} min.`
            : ''}
        </p>
      )}

      <h2 id="withdrawal">7. Prawo odstąpienia i reklamacje</h2>
      <p>
        Zgodnie z ustawą o prawach konsumenta (art. 38) 14-dniowe prawo odstąpienia{' '}
        <strong>nie</strong> przysługuje w odniesieniu do żywności przygotowanej/łatwo psującej się
        ani usług na oznaczony dzień (np. rezerwacja stolika). Nie wpływa to na Twoje ustawowe
        uprawnienia w razie wadliwego zamówienia: zgłoś problem na{' '}
        <a href={`mailto:${c.email}`}>{c.email}</a> jak najszybciej (reklamacja), a naprawimy
        sytuację. Pełny proces opisuje nasza{' '}
        <Link href="/refunds-complaints">Polityka zwrotów i reklamacji</Link>.
      </p>

      <h2 id="liability">8. Odpowiedzialność</h2>
      <p>
        Odpowiadamy za należyte wykonanie usługi zgodnie z prawem. Informacja o alergenach jest
        podana przy każdym produkcie; w przypadku poważnej alergii prosimy o kontakt przed złożeniem
        zamówienia.
      </p>

      <h2 id="disputes">9. Pozasądowe rozwiązywanie sporów</h2>
      <p>
        Konsument może skorzystać z pozasądowych sposobów rozpatrywania reklamacji i dochodzenia
        roszczeń, w tym u rzecznika konsumentów oraz podmiotów wskazanych przez UOKiK (
        <a href="https://www.uokik.gov.pl" target="_blank" rel="noreferrer">
          uokik.gov.pl
        </a>
        ).
      </p>
      <p className="text-fg-subtle">
        Uwaga: unijna platforma ODR (internetowego rozstrzygania sporów) została zamknięta przez
        Komisję Europejską 20 lipca 2025 r. i nie jest już dostępna. Prosimy korzystać z polskich
        ścieżek konsumenckich wskazanych powyżej.
      </p>

      <h2 id="law">10. Prawo właściwe i zmiany</h2>
      <p>
        Regulamin podlega prawu polskiemu. Możemy go aktualizować; data „ostatniej aktualizacji”
        wskazuje aktualną wersję, a zamówienia podlegają Regulaminowi obowiązującemu w chwili ich
        złożenia.
      </p>
    </>
  );
}
