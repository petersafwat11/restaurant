import { type CompanyInfo, LEGAL_LAST_UPDATED, getCompanyInfo } from '@/features/legal/company';
import { LegalPage } from '@/features/legal/legal-page';
import { Link } from '@/i18n/navigation';
import { getAlternates } from '@/lib/seo/alternates';
import { fetchPublicRestaurant } from '@/lib/seo/fetch-restaurant';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export function generateStaticParams() {
  return [{ locale: 'pl' }, { locale: 'en' }];
}

export function generateMetadata(): Metadata {
  return { alternates: getAlternates('/terms') };
}

function SellerBlock({ c }: { c: CompanyInfo }) {
  return (
    <p>
      <strong>{c.legalName}</strong>
      <br />
      {c.addressLines.map((l) => (
        <span key={l}>
          {l}
          <br />
        </span>
      ))}
      NIP {c.nip} · KRS {c.krs} · REGON {c.regon}
      <br />
      <a href={`mailto:${c.email}`}>{c.email}</a>
      {c.phone ? ` · ${c.phone}` : ''}
    </p>
  );
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'web.legal' });
  const restaurant = await fetchPublicRestaurant();
  const c = getCompanyInfo(restaurant);
  const deliveryRange = toMinsRange(
    restaurant?.estimatedDeliveryMinutesMin ?? null,
    restaurant?.estimatedDeliveryMinutesMax ?? null,
  );
  const pickupRange = toMinsRange(
    restaurant?.estimatedPickupMinutesMin ?? null,
    restaurant?.estimatedPickupMinutesMax ?? null,
  );
  const date = new Intl.DateTimeFormat(locale === 'pl' ? 'pl-PL' : 'en-GB', {
    dateStyle: 'long',
    timeZone: 'Europe/Warsaw',
  }).format(new Date(LEGAL_LAST_UPDATED));

  return (
    <LegalPage
      eyebrow={t('eyebrow')}
      title={t('terms.title')}
      lastUpdated={t('lastUpdated', { date })}
      footer={
        <p>
          {t('footerQuestion')}{' '}
          <Link href="/contact" className="text-accent underline underline-offset-2">
            {t('footerLink')}
          </Link>
        </p>
      }
    >
      {locale === 'pl' ? (
        <TermsPL c={c} delivery={deliveryRange} pickup={pickupRange} />
      ) : (
        <TermsEN c={c} delivery={deliveryRange} pickup={pickupRange} />
      )}
    </LegalPage>
  );
}

/** Indicative order-ready time range (minutes); `max` null = single value. */
interface MinsRange {
  min: number;
  max: number | null;
}

function toMinsRange(min: number | null, max: number | null): MinsRange | null {
  return min != null ? { min, max } : null;
}

function fmtMinsRange(r: MinsRange): string {
  return r.max != null && r.max !== r.min ? `${r.min}–${r.max}` : `${r.min}`;
}

interface TermsBodyProps {
  c: CompanyInfo;
  /** Indicative order-ready ranges (minutes); null = not configured / hidden. */
  delivery: MinsRange | null;
  pickup: MinsRange | null;
}

function TermsEN({ c, delivery, pickup }: TermsBodyProps) {
  return (
    <>
      <p>
        These Terms (the “Regulamin”) govern the use of our website and online ordering service. By
        placing an order you accept these Terms and our <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2 id="seller">1. Who we are (the Seller)</h2>
      <SellerBlock c={c} />

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
        are indicative. For pickup, we’ll tell you when your order is ready.
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
        as possible (complaint / <em>reklamacja</em>) and we’ll put it right.
      </p>

      <h2 id="liability">8. Liability</h2>
      <p>
        We are liable for the proper performance of the service in accordance with the law. Allergen
        information is provided on each product; if you have a serious allergy, please also contact
        us before ordering.
      </p>

      <h2 id="odr">9. Out-of-court dispute resolution</h2>
      <p>
        Consumers may use out-of-court complaint and redress mechanisms, including the consumer
        ombudsman and the bodies listed by the Polish Office of Competition and Consumer Protection
        (UOKiK).
      </p>

      <h2 id="law">10. Governing law &amp; changes</h2>
      <p>
        These Terms are governed by Polish law. We may update them; the “last updated” date reflects
        the current version, and orders are governed by the Terms in force when placed.
      </p>
    </>
  );
}

function TermsPL({ c, delivery, pickup }: TermsBodyProps) {
  return (
    <>
      <p>
        Niniejszy Regulamin określa zasady korzystania z naszej strony i usługi zamówień online.
        Składając zamówienie, akceptujesz Regulamin oraz naszą{' '}
        <Link href="/privacy">Politykę Prywatności</Link>.
      </p>

      <h2 id="seller">1. Sprzedawca</h2>
      <SellerBlock c={c} />

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
        sytuację.
      </p>

      <h2 id="liability">8. Odpowiedzialność</h2>
      <p>
        Odpowiadamy za należyte wykonanie usługi zgodnie z prawem. Informacja o alergenach jest
        podana przy każdym produkcie; w przypadku poważnej alergii prosimy o kontakt przed złożeniem
        zamówienia.
      </p>

      <h2 id="odr">9. Pozasądowe rozwiązywanie sporów</h2>
      <p>
        Konsument może skorzystać z pozasądowych sposobów rozpatrywania reklamacji i dochodzenia
        roszczeń, w tym u rzecznika konsumentów oraz podmiotów wskazanych przez UOKiK.
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
