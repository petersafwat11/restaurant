import type { CompanyInfo } from '@/features/legal/company';
import type { LegalSection } from '@/features/legal/legal-toc';
import { SellerIdentity } from '@/features/legal/seller-identity';
import { Link } from '@/i18n/navigation';

/**
 * Versioned source for the Privacy Policy (Polityka Prywatności / RODO notice).
 * Relocated out of the page TSX (plan §D1) with an identical PL/EN section list.
 * Polish is authoritative.
 *
 * D7: adds an Article 13/14 processing-activity table (structure) by data flow,
 * and a processor register reflecting the ACTUAL production configuration. The
 * mobile app and push notifications are intentionally omitted — that surface was
 * removed (plan Phase A). Optional vendors that may not be live in
 * production (PostHog, Sentry) are marked "if enabled".
 *
 * Binding retention periods and the precise legal-basis wording require lawyer
 * review; statements that assert a fixed period beyond the existing tax-record
 * rule are flagged with a `LAWYER` comment.
 */

export const PRIVACY_SECTIONS: LegalSection[] = [
  { id: 'controller', pl: '1. Administrator danych', en: '1. Who we are (data controller)' },
  { id: 'data', pl: '2. Jakie dane zbieramy', en: '2. What data we collect' },
  { id: 'why', pl: '3. Cel i podstawa prawna', en: '3. Why we use it & legal basis' },
  {
    id: 'processing-table',
    pl: '4. Czynności przetwarzania (art. 13/14 RODO)',
    en: '4. Processing activities (Art. 13/14 GDPR)',
  },
  {
    id: 'processors',
    pl: '5. Odbiorcy i podmioty przetwarzające',
    en: '5. Recipients & processors',
  },
  { id: 'transfers', pl: '6. Przekazywanie poza EOG', en: '6. Transfers outside the EEA' },
  { id: 'retention', pl: '7. Okres przechowywania', en: '7. How long we keep it' },
  { id: 'rights', pl: '8. Twoje prawa', en: '8. Your rights' },
  { id: 'cookies', pl: '9. Pliki cookie', en: '9. Cookies' },
  { id: 'changes', pl: '10. Zmiany', en: '10. Changes' },
];

/**
 * One row of the Art. 13/14 processing table. `required` documents whether the
 * data is necessary (and the consequence of not providing it). All cells are
 * neutral factual descriptions of structure; the exact retention commitments
 * still require lawyer/accountant sign-off (see the retention matrix handoff).
 *
 * `transfer` (the GDPR international-transfer mechanism) is optional per row; the
 * per-processor EEA status is an owner/lawyer item (§6, §18.6), so rows that do
 * not set it fall back to a neutral mechanism pointing at §6 rather than
 * inventing a per-processor claim.
 */
interface ProcessingRow {
  flow: { pl: string; en: string };
  categories: { pl: string; en: string };
  source: { pl: string; en: string };
  purpose: { pl: string; en: string };
  basis: { pl: string; en: string };
  required: { pl: string; en: string };
  recipients: { pl: string; en: string };
  transfer?: { pl: string; en: string };
  retention: { pl: string; en: string };
}

/**
 * Neutral default for the international-transfer column. Stripe/Twilio/email may
 * process outside the EEA under SCCs; the exact per-processor mechanism is
 * confirmed by the owner/lawyer (see §6). We do not assert a specific mechanism
 * per processor here.
 */
const DEFAULT_TRANSFER = {
  pl: 'W EOG; jeśli poza EOG — standardowe klauzule umowne (zob. §6)',
  en: 'Within EEA; if outside — Standard Contractual Clauses (see §6)',
} as const;

/**
 * Processing activities by data flow (plan §D7). Recipients reflect the actual
 * processors. Push notifications / the mobile app are deliberately absent (removed).
 * Reviews / reservations / loyalty / referrals are app features that are
 * conditionally enabled — kept as a single row noted as "if enabled".
 */
const PROCESSING_ROWS: ProcessingRow[] = [
  {
    flow: { pl: 'Konto i logowanie', en: 'Account & authentication' },
    categories: {
      pl: 'imię i nazwisko, e-mail, telefon, hasło (zaszyfrowane), preferowany język',
      en: 'name, email, phone, password (hashed), language preference',
    },
    source: { pl: 'od Ciebie', en: 'from you' },
    purpose: {
      pl: 'utworzenie i prowadzenie konta, uwierzytelnianie',
      en: 'creating and running your account, authentication',
    },
    basis: { pl: 'umowa (art. 6 ust. 1 lit. b)', en: 'contract (Art. 6(1)(b))' },
    required: {
      pl: 'wymagane do założenia konta',
      en: 'required to create an account',
    },
    recipients: { pl: 'hosting (Contabo)', en: 'hosting (Contabo)' },
    retention: {
      pl: 'przez czas posiadania konta', // LAWYER: confirm exact period / post-closure grace
      en: 'while the account exists', // LAWYER: confirm exact period / post-closure grace
    },
  },
  {
    flow: { pl: 'Zamówienia (gość i z kontem)', en: 'Orders (guest & registered)' },
    categories: {
      pl: 'dane kontaktowe (imię, e-mail, telefon), zawartość zamówienia, uwagi, kwoty',
      en: 'contact details (name, email, phone), order contents, notes, amounts',
    },
    source: { pl: 'od Ciebie', en: 'from you' },
    purpose: {
      pl: 'przyjęcie, realizacja i potwierdzenie zamówienia',
      en: 'taking, fulfilling and confirming your order',
    },
    basis: { pl: 'umowa (art. 6 ust. 1 lit. b)', en: 'contract (Art. 6(1)(b))' },
    required: {
      pl: 'wymagane do realizacji zamówienia',
      en: 'required to fulfil the order',
    },
    recipients: {
      pl: 'hosting (Contabo), e-mail, SMS, dostawca płatności',
      en: 'hosting (Contabo), email, SMS, payment provider',
    },
    retention: {
      pl: 'zgodnie z przepisami o rachunkowości', // LAWYER: confirm retention matrix
      en: 'as required by accounting law', // LAWYER: confirm retention matrix
    },
  },
  {
    flow: { pl: 'Adresy i lokalizacja na mapie', en: 'Addresses & map location' },
    categories: {
      pl: 'adres dostawy, punkt geolokalizacyjny (pin na mapie)',
      en: 'delivery address, geolocation pin (map point)',
    },
    source: {
      pl: 'od Ciebie; wyszukiwanie adresu przez OpenStreetMap/Nominatim',
      en: 'from you; address lookup via OpenStreetMap/Nominatim',
    },
    purpose: {
      pl: 'ustalenie obszaru dostawy i doręczenie zamówienia',
      en: 'determining the delivery area and delivering the order',
    },
    basis: { pl: 'umowa (art. 6 ust. 1 lit. b)', en: 'contract (Art. 6(1)(b))' },
    required: {
      pl: 'wymagane dla zamówień z dostawą',
      en: 'required for delivery orders',
    },
    recipients: {
      pl: 'OpenStreetMap/Nominatim (wyszukiwanie adresu), hosting (Contabo)',
      en: 'OpenStreetMap/Nominatim (address search), hosting (Contabo)',
    },
    retention: {
      pl: 'z zamówieniem lub w książce adresowej do usunięcia',
      en: 'with the order, or in your address book until deleted',
    },
  },
  {
    flow: { pl: 'Płatności online', en: 'Online payments' },
    categories: {
      pl: 'token płatności, ostatnie 4 cyfry/rodzaj karty, kwota; sygnały antyfraudowe (np. IP, urządzenie) przetwarzane przez dostawcę płatności',
      en: 'payment token, last 4 digits / card brand, amount; anti-fraud signals (e.g. IP, device) processed by the payment provider',
    },
    source: {
      pl: 'od Ciebie przez bezpieczny formularz dostawcy płatności (nie widzimy pełnego numeru karty)',
      en: 'from you via the payment provider’s secure form (we never see the full card number)',
    },
    purpose: {
      pl: 'realizacja płatności, zapobieganie nadużyciom (Stripe Radar/3DS)',
      en: 'taking payment, fraud prevention (Stripe Radar/3DS)',
    },
    basis: {
      pl: 'umowa (art. 6 ust. 1 lit. b); uzasadniony interes — bezpieczeństwo płatności (art. 6 ust. 1 lit. f)',
      en: 'contract (Art. 6(1)(b)); legitimate interest — payment security (Art. 6(1)(f))',
    },
    required: {
      pl: 'wymagane dla płatności online (alternatywą jest płatność przy odbiorze, gdy dostępna)',
      en: 'required for online payment (cash on delivery is an alternative where available)',
    },
    recipients: {
      pl: 'dostawca płatności (Stripe) jako odrębny administrator/podmiot przetwarzający',
      en: 'payment provider (Stripe) acting as separate controller/processor',
    },
    retention: {
      pl: 'referencje płatności z dokumentacją zamówienia', // LAWYER: confirm
      en: 'payment references with the order records', // LAWYER: confirm
    },
  },
  {
    flow: { pl: 'Paragony, księgowość, zwroty', en: 'Receipts, accounting, refunds' },
    categories: {
      pl: 'dane faktury/paragonu, kwoty, zwroty i spory',
      en: 'invoice/receipt data, amounts, refunds and disputes',
    },
    source: { pl: 'wygenerowane z zamówienia', en: 'generated from the order' },
    purpose: {
      pl: 'wystawienie dokumentu i obsługa zwrotów/sporów',
      en: 'issuing the document and handling refunds/disputes',
    },
    basis: { pl: 'obowiązek prawny (art. 6 ust. 1 lit. c)', en: 'legal obligation (Art. 6(1)(c))' },
    required: {
      pl: 'wymagane przepisami podatkowymi',
      en: 'required by tax law',
    },
    recipients: {
      pl: 'dostawca e-mail (paragon), dostawca płatności, hosting',
      en: 'email provider (receipt), payment provider, hosting',
    },
    retention: {
      pl: 'okres wymagany prawem podatkowym (obecnie 5 lat)',
      en: 'the period required by tax law (currently 5 years)',
    },
  },
  {
    flow: { pl: 'Wiadomości kontaktowe', en: 'Contact messages' },
    categories: {
      pl: 'imię, e-mail, treść wiadomości',
      en: 'name, email, message content',
    },
    source: { pl: 'od Ciebie', en: 'from you' },
    purpose: { pl: 'odpowiedź na zapytanie', en: 'responding to your enquiry' },
    basis: {
      pl: 'uzasadniony interes — obsługa zapytań (art. 6 ust. 1 lit. f)',
      en: 'legitimate interest — handling enquiries (Art. 6(1)(f))',
    },
    required: {
      pl: 'dobrowolne; bez nich nie odpowiemy',
      en: 'optional; without them we cannot reply',
    },
    recipients: { pl: 'dostawca e-mail, hosting', en: 'email provider, hosting' },
    retention: {
      pl: 'przez czas niezbędny do obsługi sprawy', // LAWYER: confirm period
      en: 'for as long as needed to handle the matter', // LAWYER: confirm period
    },
  },
  {
    flow: { pl: 'Newsletter (podwójna zgoda)', en: 'Newsletter (double opt-in)' },
    categories: { pl: 'e-mail, status zgody', en: 'email, consent status' },
    source: { pl: 'od Ciebie', en: 'from you' },
    purpose: {
      pl: 'wysyłka newslettera marketingowego po potwierdzeniu zapisu',
      en: 'sending the marketing newsletter after confirmed opt-in',
    },
    basis: { pl: 'zgoda (art. 6 ust. 1 lit. a)', en: 'consent (Art. 6(1)(a))' },
    required: {
      pl: 'dobrowolne; zgodę można wycofać w każdej chwili',
      en: 'optional; consent can be withdrawn anytime',
    },
    recipients: { pl: 'dostawca e-mail, hosting', en: 'email provider, hosting' },
    retention: {
      pl: 'do czasu wycofania zgody / wypisania się',
      en: 'until consent is withdrawn / you unsubscribe',
    },
  },
  {
    flow: { pl: 'Powiadomienia SMS', en: 'SMS notifications' },
    categories: { pl: 'numer telefonu, status zamówienia', en: 'phone number, order status' },
    source: { pl: 'od Ciebie (z zamówienia/konta)', en: 'from you (order/account)' },
    purpose: {
      pl: 'powiadomienia o statusie zamówienia',
      en: 'order-status notifications',
    },
    basis: {
      pl: 'umowa (art. 6 ust. 1 lit. b)',
      en: 'contract (Art. 6(1)(b))',
    },
    required: {
      pl: 'jeśli włączone — do powiadomień o zamówieniu',
      en: 'if enabled — for order notifications',
    },
    recipients: { pl: 'Twilio (jeśli włączone), hosting', en: 'Twilio (if enabled), hosting' },
    retention: {
      pl: 'przez czas realizacji zamówienia', // LAWYER: confirm
      en: 'for the duration of the order', // LAWYER: confirm
    },
  },
  {
    flow: {
      pl: 'Opinie, rezerwacje, lojalność, polecenia (jeśli włączone)',
      en: 'Reviews, reservations, loyalty, referrals (if enabled)',
    },
    categories: {
      pl: 'dane podane w danym formularzu (np. treść opinii, punkty, kody poleceń)',
      en: 'data provided in that form (e.g. review text, points, referral codes)',
    },
    source: { pl: 'od Ciebie', en: 'from you' },
    purpose: {
      pl: 'obsługa danej funkcji, gdy jest włączona',
      en: 'running the relevant feature when it is enabled',
    },
    basis: {
      pl: 'umowa lub zgoda, zależnie od funkcji', // LAWYER: confirm per feature
      en: 'contract or consent, depending on the feature', // LAWYER: confirm per feature
    },
    required: {
      pl: 'dobrowolne',
      en: 'optional',
    },
    recipients: { pl: 'hosting (Contabo)', en: 'hosting (Contabo)' },
    retention: {
      pl: 'do usunięcia lub wyłączenia funkcji', // LAWYER: confirm
      en: 'until deleted or the feature is disabled', // LAWYER: confirm
    },
  },
  {
    flow: {
      pl: 'Bezpieczeństwo, logi audytowe i serwera, kopie zapasowe',
      en: 'Security, audit & server logs, backups',
    },
    categories: {
      pl: 'adres IP, zdarzenia techniczne, dzienniki dostępu, kopie zapasowe bazy/plików',
      en: 'IP address, technical events, access logs, database/file backups',
    },
    source: {
      pl: 'automatycznie podczas korzystania z serwisu',
      en: 'automatically as you use the service',
    },
    purpose: {
      pl: 'bezpieczeństwo, diagnostyka, zapobieganie nadużyciom, odtwarzanie po awarii',
      en: 'security, diagnostics, abuse prevention, disaster recovery',
    },
    basis: {
      pl: 'uzasadniony interes — bezpieczeństwo serwisu (art. 6 ust. 1 lit. f)',
      en: 'legitimate interest — service security (Art. 6(1)(f))',
    },
    required: {
      pl: 'nieodłączne od działania serwisu',
      en: 'inherent to running the service',
    },
    recipients: {
      pl: 'hosting (Contabo); narzędzia diagnostyczne (PostHog/Sentry) jeśli włączone',
      en: 'hosting (Contabo); diagnostics (PostHog/Sentry) if enabled',
    },
    retention: {
      pl: 'ograniczony okres przechowywania logów/kopii', // LAWYER: confirm log/backup retention
      en: 'a limited log/backup retention period', // LAWYER: confirm log/backup retention
    },
  },
];

function ProcessingTable({ locale }: { locale: 'pl' | 'en' }) {
  const h =
    locale === 'pl'
      ? {
          flow: 'Czynność / przepływ danych',
          categories: 'Kategorie danych',
          source: 'Źródło',
          purpose: 'Cel',
          basis: 'Podstawa prawna',
          required: 'Czy wymagane?',
          recipients: 'Odbiorcy',
          transfer: 'Mechanizm transferu',
          retention: 'Okres przechowywania',
        }
      : {
          flow: 'Activity / data flow',
          categories: 'Data categories',
          source: 'Source',
          purpose: 'Purpose',
          basis: 'Legal basis',
          required: 'Required?',
          recipients: 'Recipients',
          transfer: 'Transfer mechanism',
          retention: 'Retention',
        };
  return (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-small">
        <thead>
          <tr>
            <th>{h.flow}</th>
            <th>{h.categories}</th>
            <th>{h.source}</th>
            <th>{h.purpose}</th>
            <th>{h.basis}</th>
            <th>{h.required}</th>
            <th>{h.recipients}</th>
            <th>{h.transfer}</th>
            <th>{h.retention}</th>
          </tr>
        </thead>
        <tbody>
          {PROCESSING_ROWS.map((row) => (
            <tr key={row.flow.en} className="text-fg-muted">
              <td>
                <strong>{row.flow[locale]}</strong>
              </td>
              <td>{row.categories[locale]}</td>
              <td>{row.source[locale]}</td>
              <td>{row.purpose[locale]}</td>
              <td>{row.basis[locale]}</td>
              <td>{row.required[locale]}</td>
              <td>{row.recipients[locale]}</td>
              <td>{(row.transfer ?? DEFAULT_TRANSFER)[locale]}</td>
              <td>{row.retention[locale]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PrivacyEN({ c }: { c: CompanyInfo }) {
  return (
    <>
      <p>
        This Privacy Policy explains how we process your personal data when you use our website and
        ordering service, in line with the EU General Data Protection Regulation (GDPR) and Polish
        data-protection law (RODO).
      </p>

      <h2 id="controller">1. Who we are (data controller)</h2>
      <SellerIdentity c={c} locale="en" />
      {c.privacyEmail && (
        <p>
          For privacy requests you can also write to{' '}
          <a href={`mailto:${c.privacyEmail}`}>{c.privacyEmail}</a>.
        </p>
      )}

      <h2 id="data">2. What data we collect</h2>
      <ul>
        <li>
          <strong>Account:</strong> name, email, phone, password (hashed), language preference.
        </li>
        <li>
          <strong>Orders &amp; delivery:</strong> delivery address and map location, order contents,
          notes, order history.
        </li>
        <li>
          <strong>Payments:</strong> handled by our payment provider — we never see or store your
          full card number, only a token and the last 4 digits / card brand.
        </li>
        <li>
          <strong>Contact, reviews, reservations, loyalty &amp; referrals:</strong> the details you
          provide in those forms (where the feature is enabled).
        </li>
        <li>
          <strong>Technical:</strong> limited usage/diagnostic data and security logs (no
          advertising cookies — see our <Link href="/cookies">Cookie Policy</Link>).
        </li>
      </ul>

      <h2 id="why">3. Why we use it &amp; legal basis</h2>
      <ul>
        <li>
          <strong>Performing your order / account (Art. 6(1)(b) GDPR):</strong> taking and
          delivering orders, managing your account, customer support.
        </li>
        <li>
          <strong>Consent (Art. 6(1)(a)):</strong> the marketing newsletter — only if you opt in,
          withdrawable anytime.
        </li>
        <li>
          <strong>Legitimate interests (Art. 6(1)(f)):</strong> securing the service, preventing
          fraud, and basic, privacy-friendly diagnostics.
        </li>
        <li>
          <strong>Legal obligation (Art. 6(1)(c)):</strong> keeping invoices/accounting records.
        </li>
      </ul>

      <h2 id="processing-table">4. Processing activities (Art. 13/14 GDPR)</h2>
      <p>
        The table below summarises each processing activity by data flow.{' '}
        {/* LAWYER: confirm
        legal bases, "required?" consequences and exact retention periods against the approved
        retention matrix before publication. */}
      </p>
      <ProcessingTable locale="en" />

      <h2 id="processors">5. Recipients &amp; processors</h2>
      <p>
        We use trusted service providers (processors) acting on our instructions. The processors
        actually used are:
      </p>
      <ul>
        <li>
          <strong>Contabo</strong> — server hosting, database, file storage and backups (our
          infrastructure provider).{' '}
          {/* LAWYER/OWNER: confirm data-centre region + DPA reference. */}
        </li>
        <li>
          <strong>Stripe</strong> — online card/BLIK payment processing and fraud prevention, when
          online payments are enabled. Stripe acts as an independent controller for some processing;
          see Stripe’s{' '}
          <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer">
            privacy policy
          </a>
          .
        </li>
        <li>
          <strong>Email provider</strong> — transactional email (order confirmations, receipts,
          account messages) via Resend or our SMTP provider.
        </li>
        <li>
          <strong>Twilio</strong> — SMS order notifications, if enabled.
        </li>
        <li>
          <strong>OpenStreetMap / Nominatim</strong> — address search and the map shown at checkout.
        </li>
        <li>
          <strong>Diagnostics (PostHog / Sentry)</strong> — product analytics and error monitoring,
          only if enabled in production.
        </li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2 id="transfers">6. Transfers outside the EEA</h2>
      <p>
        Some providers may process data outside the European Economic Area. Where that is the case,
        transfers are protected by appropriate safeguards (e.g. Standard Contractual Clauses).{' '}
        {/* LAWYER: confirm which processors transfer outside the EEA and the exact safeguard for
        each, based on the owner-confirmed processor/DPA list. */}
      </p>

      <h2 id="retention">7. How long we keep it</h2>
      <p>
        We keep account and order data for as long as you have an account and as required to provide
        the service. Invoicing/accounting records are retained for the period required by Polish tax
        law (currently 5 years). Newsletter data is kept until you unsubscribe.{' '}
        {/* LAWYER/ACCOUNTANT: replace this summary with the approved retention matrix (per data
        category), per plan §G1/§D7. */}
      </p>

      <h2 id="rights">8. Your rights</h2>
      <p>
        You have the right to access, rectify, erase, restrict, port and object to the processing of
        your personal data, and to withdraw consent at any time (without affecting prior
        processing). We respond to requests within one month (extendable for complex requests as
        permitted by the GDPR). To exercise any of these, contact us at{' '}
        <a href={`mailto:${c.privacyEmail ?? c.email}`}>{c.privacyEmail ?? c.email}</a>. You also
        have the right to lodge a complaint with the Polish supervisory authority — the President of
        the Personal Data Protection Office (UODO),{' '}
        <a href="https://uodo.gov.pl" target="_blank" rel="noreferrer">
          uodo.gov.pl
        </a>
        .
      </p>
      <p>
        Where online payments are enabled, an automated fraud assessment (Stripe Radar) may be
        applied to a transaction to protect against fraud; you can contact us to ask about a
        decision. {/* LAWYER: confirm Art. 22 wording for automated fraud checks. */}
      </p>
      <p>
        You can ask us to delete or anonymise your account. We retain only the records we are
        required to keep (e.g. accounting, fraud and dispute records) for the applicable period.{' '}
        {/* LAWYER: align with the account-deletion/anonymisation workflow (plan §G2). */}
      </p>

      <h2 id="cookies">9. Cookies</h2>
      <p>
        We use essential and functional cookies, plus conditional payment-provider cookies during
        online payment. For the full list and how to manage them, see our{' '}
        <Link href="/cookies">Cookie Policy</Link>.
      </p>

      <h2 id="changes">10. Changes</h2>
      <p>
        We may update this policy; the “last updated” date above reflects the current version.
        Material changes will be highlighted on this page.
      </p>
    </>
  );
}

export function PrivacyPL({ c }: { c: CompanyInfo }) {
  return (
    <>
      <p>
        Niniejsza Polityka Prywatności wyjaśnia, jak przetwarzamy Twoje dane osobowe, gdy korzystasz
        z naszej strony i usługi zamawiania, zgodnie z RODO (ogólne rozporządzenie o ochronie
        danych) oraz polskim prawem ochrony danych.
      </p>

      <h2 id="controller">1. Administrator danych</h2>
      <SellerIdentity c={c} locale="pl" />
      {c.privacyEmail && (
        <p>
          W sprawach dotyczących danych osobowych możesz napisać również na{' '}
          <a href={`mailto:${c.privacyEmail}`}>{c.privacyEmail}</a>.
        </p>
      )}

      <h2 id="data">2. Jakie dane zbieramy</h2>
      <ul>
        <li>
          <strong>Konto:</strong> imię i nazwisko, e-mail, telefon, hasło (zaszyfrowane),
          preferowany język.
        </li>
        <li>
          <strong>Zamówienia i dostawa:</strong> adres dostawy i lokalizacja na mapie, zawartość
          zamówienia, uwagi, historia zamówień.
        </li>
        <li>
          <strong>Płatności:</strong> obsługiwane przez dostawcę płatności — nie widzimy ani nie
          przechowujemy pełnego numeru karty, jedynie token oraz ostatnie 4 cyfry / rodzaj karty.
        </li>
        <li>
          <strong>Kontakt, opinie, rezerwacje, program lojalnościowy i polecenia:</strong> dane
          podane przez Ciebie w tych formularzach (o ile dana funkcja jest włączona).
        </li>
        <li>
          <strong>Techniczne:</strong> ograniczone dane o korzystaniu z serwisu oraz logi
          bezpieczeństwa (bez plików cookie reklamowych — zob.{' '}
          <Link href="/cookies">Polityka plików cookie</Link>).
        </li>
      </ul>

      <h2 id="why">3. Cel i podstawa prawna</h2>
      <ul>
        <li>
          <strong>Realizacja zamówienia / konta (art. 6 ust. 1 lit. b RODO):</strong> przyjmowanie i
          dostarczanie zamówień, prowadzenie konta, obsługa klienta.
        </li>
        <li>
          <strong>Zgoda (art. 6 ust. 1 lit. a):</strong> newsletter marketingowy — tylko za Twoją
          zgodą, którą możesz wycofać w każdej chwili.
        </li>
        <li>
          <strong>Prawnie uzasadniony interes (art. 6 ust. 1 lit. f):</strong> bezpieczeństwo
          serwisu, zapobieganie nadużyciom oraz podstawowa, przyjazna prywatności diagnostyka.
        </li>
        <li>
          <strong>Obowiązek prawny (art. 6 ust. 1 lit. c):</strong> przechowywanie faktur i
          dokumentacji księgowej.
        </li>
      </ul>

      <h2 id="processing-table">4. Czynności przetwarzania (art. 13/14 RODO)</h2>
      <p>
        Poniższa tabela podsumowuje czynności przetwarzania według przepływu danych.{' '}
        {/* LAWYER: zweryfikuj podstawy prawne, skutki „czy wymagane?” oraz dokładne okresy
        przechowywania względem zatwierdzonej matrycy retencji przed publikacją. */}
      </p>
      <ProcessingTable locale="pl" />

      <h2 id="processors">5. Odbiorcy i podmioty przetwarzające</h2>
      <p>
        Korzystamy z zaufanych dostawców usług (podmiotów przetwarzających) działających na nasze
        polecenie. Faktycznie wykorzystywani dostawcy to:
      </p>
      <ul>
        <li>
          <strong>Contabo</strong> — hosting serwerów, baza danych, przechowywanie plików i kopie
          zapasowe (nasz dostawca infrastruktury).{' '}
          {/* LAWYER/OWNER: potwierdź region centrum danych + numer umowy powierzenia (DPA). */}
        </li>
        <li>
          <strong>Stripe</strong> — obsługa płatności kartą/BLIK online oraz zapobieganie
          nadużyciom, gdy płatności online są włączone. W części przetwarzania Stripe jest odrębnym
          administratorem; zob.{' '}
          <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer">
            politykę prywatności Stripe
          </a>
          .
        </li>
        <li>
          <strong>Dostawca e-mail</strong> — e-maile transakcyjne (potwierdzenia zamówień, paragony,
          wiadomości konta) przez Resend lub naszego dostawcę SMTP.
        </li>
        <li>
          <strong>Twilio</strong> — powiadomienia SMS o zamówieniu, jeśli włączone.
        </li>
        <li>
          <strong>OpenStreetMap / Nominatim</strong> — wyszukiwanie adresu i mapa przy zamawianiu.
        </li>
        <li>
          <strong>Diagnostyka (PostHog / Sentry)</strong> — analityka produktowa i monitoring
          błędów, wyłącznie jeśli włączone w produkcji.
        </li>
      </ul>
      <p>Nie sprzedajemy Twoich danych osobowych.</p>

      <h2 id="transfers">6. Przekazywanie poza EOG</h2>
      <p>
        Część dostawców może przetwarzać dane poza Europejskim Obszarem Gospodarczym. W takim
        przypadku przekazywanie jest zabezpieczone odpowiednimi środkami (np. standardowymi
        klauzulami umownymi).{' '}
        {/* LAWYER: potwierdź, którzy dostawcy przekazują dane poza EOG i dokładny mechanizm
        zabezpieczeń dla każdego, na podstawie potwierdzonej przez właściciela listy dostawców/DPA. */}
      </p>

      <h2 id="retention">7. Okres przechowywania</h2>
      <p>
        Dane konta i zamówień przechowujemy tak długo, jak posiadasz konto i jak to konieczne do
        świadczenia usługi. Dokumentację księgową/faktury przechowujemy przez okres wymagany polskim
        prawem podatkowym (obecnie 5 lat). Dane newslettera — do czasu wypisania się.{' '}
        {/* LAWYER/KSIĘGOWY: zastąp to podsumowanie zatwierdzoną matrycą retencji (per kategoria
        danych), zgodnie z planem §G1/§D7. */}
      </p>

      <h2 id="rights">8. Twoje prawa</h2>
      <p>
        Masz prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania,
        przenoszenia i wniesienia sprzeciwu, a także wycofania zgody w dowolnym momencie (bez wpływu
        na wcześniejsze przetwarzanie). Na wnioski odpowiadamy w ciągu jednego miesiąca (z
        możliwością przedłużenia dla złożonych wniosków, zgodnie z RODO). Aby skorzystać z tych
        praw, napisz na{' '}
        <a href={`mailto:${c.privacyEmail ?? c.email}`}>{c.privacyEmail ?? c.email}</a>. Przysługuje
        Ci również prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (UODO),{' '}
        <a href="https://uodo.gov.pl" target="_blank" rel="noreferrer">
          uodo.gov.pl
        </a>
        .
      </p>
      <p>
        Gdy płatności online są włączone, do transakcji może być stosowana automatyczna ocena ryzyka
        nadużyć (Stripe Radar) w celu ochrony przed oszustwami; możesz skontaktować się z nami, aby
        zapytać o decyzję.{' '}
        {/* LAWYER: potwierdź treść dot. art. 22 dla automatycznej oceny ryzyka. */}
      </p>
      <p>
        Możesz poprosić o usunięcie lub anonimizację konta. Zachowujemy wyłącznie te dane, które
        jesteśmy zobowiązani przechowywać (np. dokumentacja księgowa, dane o nadużyciach i sporach)
        przez właściwy okres.{' '}
        {/* LAWYER: dostosuj do procesu usuwania/anonimizacji konta (plan §G2). */}
      </p>

      <h2 id="cookies">9. Pliki cookie</h2>
      <p>
        Używamy niezbędnych i funkcjonalnych plików cookie oraz warunkowych plików cookie dostawcy
        płatności podczas płatności online. Pełna lista i sposób zarządzania — zob.{' '}
        <Link href="/cookies">Polityka plików cookie</Link>.
      </p>

      <h2 id="changes">10. Zmiany</h2>
      <p>
        Możemy aktualizować tę politykę; data „ostatniej aktualizacji” powyżej wskazuje aktualną
        wersję. O istotnych zmianach poinformujemy na tej stronie.
      </p>
    </>
  );
}
