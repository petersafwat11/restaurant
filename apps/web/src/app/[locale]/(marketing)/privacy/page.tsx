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
  return { alternates: getAlternates('/privacy') };
}

function CompanyBlock({ c }: { c: CompanyInfo }) {
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

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'web.legal' });
  const restaurant = await fetchPublicRestaurant();
  const c = getCompanyInfo(restaurant);
  const date = new Intl.DateTimeFormat(locale === 'pl' ? 'pl-PL' : 'en-GB', {
    dateStyle: 'long',
    timeZone: 'Europe/Warsaw',
  }).format(new Date(LEGAL_LAST_UPDATED));

  return (
    <LegalPage
      eyebrow={t('eyebrow')}
      title={t('privacy.title')}
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
      {locale === 'pl' ? <PrivacyPL c={c} /> : <PrivacyEN c={c} />}
    </LegalPage>
  );
}

function PrivacyEN({ c }: { c: CompanyInfo }) {
  return (
    <>
      <p>
        This Privacy Policy explains how we process your personal data when you use our website and
        ordering service, in line with the EU General Data Protection Regulation (GDPR) and Polish
        data-protection law (RODO).
      </p>

      <h2 id="controller">1. Who we are (data controller)</h2>
      <CompanyBlock c={c} />

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
          provide in those forms.
        </li>
        <li>
          <strong>Technical:</strong> limited usage/diagnostic data (no advertising cookies — see
          our <Link href="/cookies">Cookie Policy</Link>).
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
          fraud, and basic, privacy-friendly analytics.
        </li>
        <li>
          <strong>Legal obligation (Art. 6(1)(c)):</strong> keeping invoices/accounting records.
        </li>
      </ul>

      <h2 id="processors">4. Who we share data with</h2>
      <p>
        We use trusted service providers (processors) acting on our instructions: payment processing
        (Stripe), transactional email, SMS notifications, push notifications, map/address search
        (OpenStreetMap), and hosting. Some of these providers are located outside the EEA; where
        that is the case, transfers are protected by appropriate safeguards (e.g. Standard
        Contractual Clauses). We do not sell your personal data.
      </p>

      <h2 id="retention">5. How long we keep it</h2>
      <p>
        We keep account and order data for as long as you have an account and as required to provide
        the service. Invoicing/accounting records are retained for the period required by Polish tax
        law (currently 5 years). Newsletter data is kept until you unsubscribe.
      </p>

      <h2 id="rights">6. Your rights</h2>
      <p>
        You have the right to access, rectify, erase, restrict, port and object to the processing of
        your personal data, and to withdraw consent at any time (without affecting prior
        processing). To exercise any of these, contact us at{' '}
        <a href={`mailto:${c.email}`}>{c.email}</a>. You also have the right to lodge a complaint
        with the Polish supervisory authority — the President of the Personal Data Protection Office
        (UODO),{' '}
        <a href="https://uodo.gov.pl" target="_blank" rel="noreferrer">
          uodo.gov.pl
        </a>
        .
      </p>

      <h2 id="cookies">7. Cookies</h2>
      <p>
        We use only essential and functional cookies. For the full list and how to manage them, see
        our <Link href="/cookies">Cookie Policy</Link>.
      </p>

      <h2 id="changes">8. Changes</h2>
      <p>
        We may update this policy; the “last updated” date above reflects the current version.
        Material changes will be highlighted on this page.
      </p>
    </>
  );
}

function PrivacyPL({ c }: { c: CompanyInfo }) {
  return (
    <>
      <p>
        Niniejsza Polityka Prywatności wyjaśnia, jak przetwarzamy Twoje dane osobowe, gdy korzystasz
        z naszej strony i usługi zamawiania, zgodnie z RODO (ogólne rozporządzenie o ochronie
        danych) oraz polskim prawem ochrony danych.
      </p>

      <h2 id="controller">1. Kim jesteśmy (administrator danych)</h2>
      <CompanyBlock c={c} />

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
          podane przez Ciebie w tych formularzach.
        </li>
        <li>
          <strong>Techniczne:</strong> ograniczone dane o korzystaniu z serwisu (bez plików cookie
          reklamowych — zob. <Link href="/cookies">Polityka plików cookie</Link>).
        </li>
      </ul>

      <h2 id="why">3. W jakim celu i na jakiej podstawie</h2>
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
          serwisu, zapobieganie nadużyciom oraz podstawowa, przyjazna prywatności analityka.
        </li>
        <li>
          <strong>Obowiązek prawny (art. 6 ust. 1 lit. c):</strong> przechowywanie faktur i
          dokumentacji księgowej.
        </li>
      </ul>

      <h2 id="processors">4. Komu udostępniamy dane</h2>
      <p>
        Korzystamy z zaufanych dostawców usług (podmiotów przetwarzających) działających na nasze
        polecenie: obsługa płatności (Stripe), e-maile transakcyjne, powiadomienia SMS,
        powiadomienia push, wyszukiwanie map/adresów (OpenStreetMap) oraz hosting. Część dostawców
        znajduje się poza EOG; w takim przypadku przekazywanie danych jest zabezpieczone
        odpowiednimi środkami (np. standardowymi klauzulami umownymi). Nie sprzedajemy Twoich danych
        osobowych.
      </p>

      <h2 id="retention">5. Jak długo przechowujemy dane</h2>
      <p>
        Dane konta i zamówień przechowujemy tak długo, jak posiadasz konto i jak to konieczne do
        świadczenia usługi. Dokumentację księgową/faktury przechowujemy przez okres wymagany polskim
        prawem podatkowym (obecnie 5 lat). Dane newslettera — do czasu wypisania się.
      </p>

      <h2 id="rights">6. Twoje prawa</h2>
      <p>
        Masz prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania,
        przenoszenia i wniesienia sprzeciwu, a także wycofania zgody w dowolnym momencie (bez wpływu
        na wcześniejsze przetwarzanie). Aby skorzystać z tych praw, napisz na{' '}
        <a href={`mailto:${c.email}`}>{c.email}</a>. Przysługuje Ci również prawo wniesienia skargi
        do Prezesa Urzędu Ochrony Danych Osobowych (UODO),{' '}
        <a href="https://uodo.gov.pl" target="_blank" rel="noreferrer">
          uodo.gov.pl
        </a>
        .
      </p>

      <h2 id="cookies">7. Pliki cookie</h2>
      <p>
        Używamy wyłącznie niezbędnych i funkcjonalnych plików cookie. Pełna lista i sposób
        zarządzania — zob. <Link href="/cookies">Polityka plików cookie</Link>.
      </p>

      <h2 id="changes">8. Zmiany</h2>
      <p>
        Możemy aktualizować tę politykę; data „ostatniej aktualizacji” powyżej wskazuje aktualną
        wersję. O istotnych zmianach poinformujemy na tej stronie.
      </p>
    </>
  );
}
