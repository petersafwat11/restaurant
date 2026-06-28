import type { LegalSection } from '@/features/legal/legal-toc';
import { Link } from '@/i18n/navigation';

/**
 * General Promotion / Loyalty / Referral terms (plan §D6) — NEW page. STRUCTURE
 * for the conditions that apply across promotions; a specific promotion's own
 * terms (where it differs) are shown wherever that promotion is advertised.
 *
 * Binding rules (reversal on refund, abuse handling, exact limits) are LAWYER
 * placeholders. The one concrete parameter we can state factually is the
 * timezone all start/end times are evaluated in — the restaurant timezone
 * (Europe/Warsaw), passed in as a prop.
 *
 * This document is NOT part of the order legal bundle (LEGAL_BUNDLE_DOCUMENTS) —
 * it is a standing policy page, like the cookie notice.
 */

export const PROMO_SECTIONS: LegalSection[] = [
  { id: 'scope', pl: '1. Zakres', en: '1. Scope' },
  { id: 'eligibility', pl: '2. Uprawnieni uczestnicy', en: '2. Eligibility' },
  { id: 'timing', pl: '3. Czas trwania i strefa czasowa', en: '3. Timing & timezone' },
  { id: 'codes', pl: '4. Kody i limity', en: '4. Codes & limits' },
  { id: 'minimum', pl: '5. Minimalna wartość zamówienia', en: '5. Minimum order value' },
  { id: 'stacking', pl: '6. Łączenie i lojalność', en: '6. Stacking & loyalty' },
  { id: 'channels', pl: '7. Kanały i wyłączenia', en: '7. Channels & exclusions' },
  { id: 'loyalty-referrals', pl: '8. Lojalność i polecenia', en: '8. Loyalty & referrals' },
  { id: 'refunds', pl: '9. Zwroty i cofnięcie', en: '9. Refunds & reversal' },
  { id: 'abuse', pl: '10. Nadużycia i zmiany', en: '10. Abuse & changes' },
];

export function PromoEN({ timezone }: { timezone: string }) {
  return (
    <>
      <p>
        These general terms apply to promotions, discount codes, the loyalty programme and the
        referral programme offered through our website, alongside our{' '}
        <Link href="/terms">Terms</Link>. A specific promotion may add its own conditions, which are
        shown where that promotion is advertised; where they differ, the specific conditions apply.
        These terms do not limit your mandatory consumer rights.
      </p>

      <h2 id="scope">1. Scope</h2>
      <p>
        “Promotion” means any discount, coupon code, free-delivery offer, loyalty reward or referral
        benefit we make available. Promotions are optional and may be limited in time and quantity.
      </p>

      <h2 id="eligibility">2. Eligibility</h2>
      <p>
        {/* LAWYER: state who is eligible (e.g. registered accounts vs guests, new vs existing
        customers, one per person/household) and any age/territory conditions. */}
        Unless a promotion says otherwise, it is open to customers ordering through our website.
      </p>

      <h2 id="timing">3. Timing &amp; timezone</h2>
      <p>
        Each promotion has a start and end time. All start/end times are evaluated in the
        restaurant’s local timezone (<strong>{timezone}</strong>). An order qualifies only if it is
        placed within the promotion window.
      </p>

      <h2 id="codes">4. Codes &amp; limits</h2>
      <p>
        Some promotions require a code entered at checkout. A promotion may have an overall
        redemption limit and a per-customer limit, and a code may be single-use.{' '}
        {/* LAWYER/OWNER: confirm default code limits and whether codes are case-sensitive. */}
      </p>

      <h2 id="minimum">5. Minimum order value</h2>
      <p>
        A promotion may require a minimum order subtotal, shown with the promotion. The discount is
        calculated on the server against the eligible subtotal.
      </p>

      <h2 id="stacking">6. Stacking &amp; loyalty</h2>
      <p>
        Unless stated otherwise, promotions cannot be combined with each other. A loyalty discount
        and a coupon may interact, and any combined discount is clamped so it never exceeds the
        eligible amount.{' '}
        {/* LAWYER/OWNER: confirm the stacking rule (coupon + loyalty) and the
        clamping order. */}
      </p>

      <h2 id="channels">7. Channels &amp; exclusions</h2>
      <p>
        A promotion may be limited to certain order channels (delivery, pickup, dine-in) or exclude
        certain items. Any such limits are shown with the promotion.
      </p>

      <h2 id="loyalty-referrals">8. Loyalty &amp; referrals</h2>
      <p>
        Where enabled, the loyalty programme awards points or rewards for qualifying orders, and the
        referral programme rewards a referrer and/or referee when a referral completes.{' '}
        {/* LAWYER/OWNER: state how points are earned/redeemed, expiry, and what counts as a
        completed referral; confirm both features are actually enabled before publishing this
        section. */}
      </p>

      <h2 id="refunds">9. Refunds &amp; reversal</h2>
      <p>
        If an order that used a promotion is refunded or cancelled, the discount, any loyalty points
        earned or spent, and any referral benefit may be reversed accordingly.{' '}
        {/* LAWYER: state the exact refund effect — does a refund restore a single-use code or
        spent points? — consistent with mandatory rights. */}
      </p>

      <h2 id="abuse">10. Abuse &amp; changes</h2>
      <p>
        We may withhold or reverse a benefit obtained through fraud, error or abuse, and we may
        amend or end a promotion.{' '}
        {/* LAWYER: ensure abuse/cancellation wording preserves mandatory
        consumer rights and does not affect orders already validly placed. */}
      </p>
    </>
  );
}

export function PromoPL({ timezone }: { timezone: string }) {
  return (
    <>
      <p>
        Te ogólne warunki dotyczą promocji, kodów rabatowych, programu lojalnościowego i programu
        poleceń oferowanych przez naszą stronę, obok naszego <Link href="/terms">Regulaminu</Link>.
        Konkretna promocja może dodać własne warunki, pokazywane tam, gdzie jest reklamowana; w
        razie rozbieżności obowiązują warunki szczegółowe. Warunki te nie ograniczają bezwzględnie
        obowiązujących praw konsumenta.
      </p>

      <h2 id="scope">1. Zakres</h2>
      <p>
        „Promocja” oznacza dowolny rabat, kod kuponu, ofertę darmowej dostawy, nagrodę lojalnościową
        lub korzyść z polecenia, którą udostępniamy. Promocje są dobrowolne i mogą być ograniczone w
        czasie oraz ilościowo.
      </p>

      <h2 id="eligibility">2. Uprawnieni uczestnicy</h2>
      <p>
        {/* LAWYER: wskaż, kto jest uprawniony (np. konta zarejestrowane vs goście, nowi vs obecni
        klienci, jeden na osobę/gospodarstwo) oraz ewentualne warunki wiekowe/terytorialne. */}
        O ile promocja nie stanowi inaczej, jest dostępna dla klientów zamawiających przez naszą
        stronę.
      </p>

      <h2 id="timing">3. Czas trwania i strefa czasowa</h2>
      <p>
        Każda promocja ma czas rozpoczęcia i zakończenia. Wszystkie godziny rozpoczęcia/zakończenia
        liczone są w lokalnej strefie czasowej restauracji (<strong>{timezone}</strong>). Zamówienie
        kwalifikuje się tylko, jeśli zostało złożone w okresie obowiązywania promocji.
      </p>

      <h2 id="codes">4. Kody i limity</h2>
      <p>
        Niektóre promocje wymagają wpisania kodu przy zamawianiu. Promocja może mieć łączny limit
        wykorzystań oraz limit na klienta, a kod może być jednorazowy.{' '}
        {/* LAWYER/OWNER: potwierdź domyślne limity kodów oraz czy kody rozróżniają wielkość liter. */}
      </p>

      <h2 id="minimum">5. Minimalna wartość zamówienia</h2>
      <p>
        Promocja może wymagać minimalnej wartości zamówienia, pokazanej przy promocji. Rabat
        obliczany jest po stronie serwera względem kwalifikującej się kwoty.
      </p>

      <h2 id="stacking">6. Łączenie i lojalność</h2>
      <p>
        O ile nie wskazano inaczej, promocji nie można łączyć ze sobą. Rabat lojalnościowy i kupon
        mogą na siebie wpływać, a łączny rabat jest ograniczany tak, aby nigdy nie przekroczył
        kwalifikującej się kwoty.{' '}
        {/* LAWYER/OWNER: potwierdź regułę łączenia (kupon + lojalność) i
        kolejność ograniczania. */}
      </p>

      <h2 id="channels">7. Kanały i wyłączenia</h2>
      <p>
        Promocja może być ograniczona do określonych kanałów (dostawa, odbiór, na miejscu) lub
        wyłączać określone pozycje. Takie ograniczenia są pokazane przy promocji.
      </p>

      <h2 id="loyalty-referrals">8. Lojalność i polecenia</h2>
      <p>
        Tam, gdzie włączone, program lojalnościowy przyznaje punkty lub nagrody za kwalifikujące się
        zamówienia, a program poleceń nagradza polecającego i/lub poleconego po zrealizowaniu
        polecenia.{' '}
        {/* LAWYER/OWNER: wskaż, jak zdobywa się/wymienia punkty, ich wygaśnięcie oraz co
        jest zrealizowanym poleceniem; potwierdź, że obie funkcje są faktycznie włączone przed
        publikacją tej sekcji. */}
      </p>

      <h2 id="refunds">9. Zwroty i cofnięcie</h2>
      <p>
        Jeśli zamówienie z wykorzystaną promocją zostanie zwrócone lub anulowane, rabat, ewentualne
        zdobyte lub wykorzystane punkty lojalnościowe oraz korzyść z polecenia mogą zostać
        odpowiednio cofnięte.{' '}
        {/* LAWYER: wskaż dokładny skutek zwrotu — czy zwrot przywraca
        jednorazowy kod lub wykorzystane punkty? — zgodnie z bezwzględnie obowiązującymi prawami. */}
      </p>

      <h2 id="abuse">10. Nadużycia i zmiany</h2>
      <p>
        Możemy wstrzymać lub cofnąć korzyść uzyskaną w wyniku oszustwa, błędu lub nadużycia oraz
        możemy zmienić lub zakończyć promocję.{' '}
        {/* LAWYER: upewnij się, że treść o
        nadużyciach/anulowaniu zachowuje bezwzględnie obowiązujące prawa konsumenta i nie wpływa na
        zamówienia już prawidłowo złożone. */}
      </p>
    </>
  );
}
