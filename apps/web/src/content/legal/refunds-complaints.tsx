import type { CompanyInfo } from '@/features/legal/company';
import type { LegalSection } from '@/features/legal/legal-toc';
import { Link } from '@/i18n/navigation';

/**
 * Refunds & Complaints policy (plan §D4) — NEW page. This is STRUCTURE only:
 * headings, the on-page TOC, contact channels from the DB legal block, and
 * neutral factual summaries. Every statement of a consumer right, remedy, or
 * deadline is an inline LAWYER placeholder, because those assert legal
 * consequences and must be written/approved by a Polish lawyer.
 *
 * This document IS part of the accepted legal bundle (LEGAL_BUNDLE_DOCUMENTS).
 */

export const REFUNDS_SECTIONS: LegalSection[] = [
  { id: 'scope', pl: '1. Czego dotyczy', en: '1. What this covers' },
  { id: 'food-returns', pl: '2. Żywności nie można „zwrócić”', en: '2. Food cannot be “returned”' },
  { id: 'eligible', pl: '3. Kiedy przysługuje reklamacja', en: '3. When you can complain' },
  { id: 'how', pl: '4. Jak złożyć reklamację', en: '4. How to submit a complaint' },
  { id: 'response', pl: '5. Nasza odpowiedź', en: '5. Our response' },
  { id: 'outcomes', pl: '6. Możliwe rozstrzygnięcia', en: '6. Possible outcomes' },
  { id: 'refund-method', pl: '7. Sposób zwrotu środków', en: '7. How refunds are paid' },
  { id: 'chargeback', pl: '8. Obciążenia zwrotne (chargeback)', en: '8. Chargebacks & disputes' },
  {
    id: 'disputes',
    pl: '9. Pozasądowe rozwiązywanie sporów',
    en: '9. Out-of-court dispute resolution',
  },
];

export function RefundsEN({ c }: { c: CompanyInfo }) {
  const complaints = c.complaintsEmail ?? c.email;
  return (
    <>
      <p>
        This policy explains how to report a problem with an order and how refunds and complaints (
        <em>reklamacje</em>) are handled. It works together with our{' '}
        <Link href="/terms">Terms</Link> and{' '}
        <Link href="/delivery-cancellation">Delivery &amp; Cancellation Policy</Link>. It does not
        limit your mandatory rights as a consumer under Polish law.
      </p>

      <h2 id="scope">1. What this covers</h2>
      <p>
        Problems with food orders placed through our website — for example non-delivery, incorrect
        or missing items, quality issues, or an incorrect charge.
      </p>

      <h2 id="food-returns">2. Food cannot be “returned”</h2>
      <p>
        Prepared and perishable food cannot be physically returned for resale, and the 14-day
        distance-selling withdrawal right does not apply to it (see the{' '}
        <Link href="/terms#withdrawal">Terms</Link>). This is separate from — and does not affect —
        your statutory right to complain about an order that is defective or not as described.{' '}
        {/* LAWYER: confirm the exact relationship between art. 38 withdrawal exemption and statutory
        non-conformity rights for prepared food. */}
      </p>

      <h2 id="eligible">3. When you can complain</h2>
      <p>Typical situations include:</p>
      <ul>
        <li>your order was not delivered;</li>
        <li>items were missing, incorrect, or substituted without your approval;</li>
        <li>the food had a material quality problem or was not as described;</li>
        <li>the food was unsafe or contaminated;</li>
        <li>an order was cancelled and approved for a refund;</li>
        <li>you were charged twice or charged an incorrect amount.</li>
      </ul>
      <p>
        {/* LAWYER: state the consumer's statutory claim period and any conditions; do NOT
        contractually shorten it. */}
      </p>

      <h2 id="how">4. How to submit a complaint</h2>
      <p>
        Please contact us as soon as you can, with your <strong>order number</strong>, a description
        of the problem, and (optionally) photos as evidence:
      </p>
      <ul>
        {complaints && (
          <li>
            Email: <a href={`mailto:${complaints}`}>{complaints}</a>
          </li>
        )}
        {c.phone && (
          <li>
            Phone: <a href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a>
          </li>
        )}
        <li>
          Contact form: <Link href="/contact">/contact</Link>
        </li>
      </ul>

      <h2 id="response">5. Our response</h2>
      <p>
        {/* LAWYER: state the response deadline consistent with Polish law (e.g. the 14-day rule for
        consumer complaints where applicable) and what happens if we do not respond in time. Do NOT
        invent a shorter period. */}
        We will acknowledge your complaint and respond within the period required by law.
      </p>

      <h2 id="outcomes">6. Possible outcomes</h2>
      <p>Depending on the issue and the applicable law, the outcome may be:</p>
      <ul>
        <li>a replacement or redelivery, where practical;</li>
        <li>a price reduction;</li>
        <li>a partial refund;</li>
        <li>a full refund.</li>
      </ul>
      <p>
        {/* LAWYER: confirm which remedies apply in which situation and the order of remedies under
        the Consumer Rights Act. */}
      </p>

      <h2 id="refund-method">7. How refunds are paid</h2>
      <p>
        Approved electronic refunds are returned to the original payment method. Cash / cash-on-
        delivery refunds are handled separately.{' '}
        {/* LAWYER/OWNER: state the operational promise — "we initiate the refund within X business
        days" — separately from the bank/card posting time, which we do not control. */}
      </p>

      <h2 id="chargeback">8. Chargebacks &amp; disputes</h2>
      <p>
        If you paid by card you may also have rights through your bank or card network. Raising a
        complaint with us does not remove those rights.{' '}
        {/* LAWYER: ensure chargeback/dispute wording does not obstruct statutory or card-network
        rights. */}
      </p>

      <h2 id="disputes">9. Out-of-court dispute resolution</h2>
      <p>
        If we cannot resolve a complaint, consumers may use out-of-court routes, including the
        consumer ombudsman (rzecznik konsumentów) and the bodies listed by UOKiK (
        <a href="https://www.uokik.gov.pl" target="_blank" rel="noreferrer">
          uokik.gov.pl
        </a>
        ).
      </p>
      <p className="text-fg-subtle">
        Note: the EU Online Dispute Resolution (ODR) platform was closed by the European Commission
        on 20 July 2025 and is no longer available. Please use the Polish consumer routes above.
      </p>
    </>
  );
}

export function RefundsPL({ c }: { c: CompanyInfo }) {
  const complaints = c.complaintsEmail ?? c.email;
  return (
    <>
      <p>
        Ta polityka wyjaśnia, jak zgłosić problem z zamówieniem oraz jak rozpatrujemy zwroty i
        reklamacje. Obowiązuje wraz z naszym <Link href="/terms">Regulaminem</Link> i{' '}
        <Link href="/delivery-cancellation">Polityką dostaw i anulowania</Link>. Nie ogranicza
        Twoich bezwzględnie obowiązujących praw konsumenta wynikających z prawa polskiego.
      </p>

      <h2 id="scope">1. Czego dotyczy</h2>
      <p>
        Problemów z zamówieniami jedzenia złożonymi przez naszą stronę — np. brak doręczenia, błędne
        lub brakujące pozycje, problemy jakościowe lub błędne obciążenie.
      </p>

      <h2 id="food-returns">2. Żywności nie można „zwrócić”</h2>
      <p>
        Żywności przygotowanej i łatwo psującej się nie można fizycznie zwrócić do dalszej
        sprzedaży, a 14-dniowe prawo odstąpienia w sprzedaży na odległość jej nie dotyczy (zob.{' '}
        <Link href="/terms#withdrawal">Regulamin</Link>). Jest to odrębne od — i nie wpływa na —
        Twoje ustawowe prawo do reklamacji zamówienia wadliwego lub niezgodnego z opisem.{' '}
        {/* LAWYER: potwierdź relację między wyłączeniem z art. 38 a ustawowymi prawami z tytułu
        niezgodności dla żywności przygotowanej. */}
      </p>

      <h2 id="eligible">3. Kiedy przysługuje reklamacja</h2>
      <p>Typowe sytuacje to:</p>
      <ul>
        <li>zamówienie nie zostało doręczone;</li>
        <li>pozycje były brakujące, błędne lub zamienione bez Twojej zgody;</li>
        <li>żywność miała istotną wadę jakościową lub była niezgodna z opisem;</li>
        <li>żywność była niebezpieczna lub zanieczyszczona;</li>
        <li>zamówienie zostało anulowane i zaakceptowane do zwrotu;</li>
        <li>obciążono Cię dwukrotnie lub błędną kwotą.</li>
      </ul>
      <p>
        {/* LAWYER: wskaż ustawowy termin na reklamację konsumenta i ewentualne warunki; NIE skracaj
        go umownie. */}
      </p>

      <h2 id="how">4. Jak złożyć reklamację</h2>
      <p>
        Skontaktuj się z nami jak najszybciej, podając <strong>numer zamówienia</strong>, opis
        problemu oraz (opcjonalnie) zdjęcia jako dowód:
      </p>
      <ul>
        {complaints && (
          <li>
            E-mail: <a href={`mailto:${complaints}`}>{complaints}</a>
          </li>
        )}
        {c.phone && (
          <li>
            Telefon: <a href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a>
          </li>
        )}
        <li>
          Formularz kontaktowy: <Link href="/contact">/contact</Link>
        </li>
      </ul>

      <h2 id="response">5. Nasza odpowiedź</h2>
      <p>
        {/* LAWYER: wskaż termin odpowiedzi zgodny z prawem polskim (np. 14 dni dla reklamacji
        konsumenta, gdy dotyczy) oraz skutek braku odpowiedzi w terminie. NIE wymyślaj krótszego
        terminu. */}
        Potwierdzimy przyjęcie reklamacji i odpowiemy w terminie wymaganym przepisami.
      </p>

      <h2 id="outcomes">6. Możliwe rozstrzygnięcia</h2>
      <p>W zależności od problemu i obowiązującego prawa rozstrzygnięciem może być:</p>
      <ul>
        <li>wymiana lub ponowne doręczenie, gdy to możliwe;</li>
        <li>obniżenie ceny;</li>
        <li>częściowy zwrot;</li>
        <li>pełny zwrot.</li>
      </ul>
      <p>
        {/* LAWYER: potwierdź, które środki przysługują w jakiej sytuacji oraz kolejność środków wg
        ustawy o prawach konsumenta. */}
      </p>

      <h2 id="refund-method">7. Sposób zwrotu środków</h2>
      <p>
        Zaakceptowane zwroty elektroniczne realizujemy na pierwotną metodę płatności. Zwroty gotówki
        / przy płatności za pobraniem obsługujemy odrębnie.{' '}
        {/* LAWYER/OWNER: wskaż zobowiązanie operacyjne — „zwrot inicjujemy w ciągu X dni roboczych”
        — odrębnie od czasu księgowania przez bank/kartę, na który nie mamy wpływu. */}
      </p>

      <h2 id="chargeback">8. Obciążenia zwrotne (chargeback)</h2>
      <p>
        Jeśli płatność nastąpiła kartą, możesz mieć dodatkowe uprawnienia w banku lub organizacji
        kartowej. Złożenie reklamacji u nas nie pozbawia Cię tych uprawnień.{' '}
        {/* LAWYER: upewnij się, że treść o chargeback/sporach nie ogranicza praw ustawowych ani praw
        organizacji kartowej. */}
      </p>

      <h2 id="disputes">9. Pozasądowe rozwiązywanie sporów</h2>
      <p>
        Jeśli nie rozwiążemy reklamacji, konsument może skorzystać z pozasądowych ścieżek, w tym u
        rzecznika konsumentów oraz podmiotów wskazanych przez UOKiK (
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
    </>
  );
}
