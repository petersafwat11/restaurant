import { LEGAL_LAST_UPDATED } from '@/features/legal/company';
import { LegalPage } from '@/features/legal/legal-page';
import { Link } from '@/i18n/navigation';
import { getAlternates } from '@/lib/seo/alternates';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export function generateStaticParams() {
  return [{ locale: 'pl' }, { locale: 'en' }];
}

export function generateMetadata(): Metadata {
  return { alternates: getAlternates('/cookies') };
}

export default async function CookiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'web.legal' });
  const date = new Intl.DateTimeFormat(locale === 'pl' ? 'pl-PL' : 'en-GB', {
    dateStyle: 'long',
  }).format(new Date(LEGAL_LAST_UPDATED));

  return (
    <LegalPage
      eyebrow={t('eyebrow')}
      title={t('cookies.title')}
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
      {locale === 'pl' ? <CookiesPL /> : <CookiesEN />}
    </LegalPage>
  );
}

function CookiesEN() {
  return (
    <>
      <p>
        Cookies are small files stored on your device. We use only the cookies needed to run the
        site — we do <strong>not</strong> use advertising or third-party tracking cookies.
      </p>

      <h2 id="cookies-we-use">Cookies we use</h2>
      <table>
        <thead>
          <tr>
            <th>Cookie</th>
            <th>Purpose</th>
            <th>Type</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>web_at</td>
            <td>Keeps you signed in (access token)</td>
            <td>Strictly necessary</td>
            <td>Session / short-lived</td>
          </tr>
          <tr>
            <td>web_rt</td>
            <td>Refreshes your sign-in (refresh token)</td>
            <td>Strictly necessary</td>
            <td>~30 days</td>
          </tr>
          <tr>
            <td>cart_session</td>
            <td>Remembers a guest cart between visits</td>
            <td>Strictly necessary</td>
            <td>30 days</td>
          </tr>
          <tr>
            <td>NEXT_LOCALE</td>
            <td>Remembers your language choice</td>
            <td>Functional</td>
            <td>~1 year</td>
          </tr>
        </tbody>
      </table>

      <h2 id="analytics">Analytics &amp; marketing</h2>
      <p>
        We currently use <strong>no</strong> analytics or marketing cookies. Our usage analytics
        runs on the server and sets no cookies, and our location map uses OpenStreetMap, which sets
        no tracking cookies. Because only essential/functional cookies are used, no cookie-consent
        banner is required. If we ever add non-essential cookies, we will ask for your consent
        first.
      </p>

      <h2 id="managing">Managing cookies</h2>
      <p>
        You can delete or block cookies in your browser settings. Note that blocking strictly
        necessary cookies will break sign-in and the cart.
      </p>

      <h2 id="more">More information</h2>
      <p>
        See our <Link href="/privacy">Privacy Policy</Link> for how we handle personal data. The
        “last updated” date above reflects the current version.
      </p>
    </>
  );
}

function CookiesPL() {
  return (
    <>
      <p>
        Pliki cookie to małe pliki zapisywane na Twoim urządzeniu. Używamy wyłącznie plików cookie
        niezbędnych do działania serwisu — <strong>nie</strong> stosujemy reklamowych ani śledzących
        plików cookie podmiotów trzecich.
      </p>

      <h2 id="cookies-we-use">Pliki cookie, których używamy</h2>
      <table>
        <thead>
          <tr>
            <th>Cookie</th>
            <th>Cel</th>
            <th>Rodzaj</th>
            <th>Czas</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>web_at</td>
            <td>Utrzymuje zalogowanie (token dostępu)</td>
            <td>Niezbędny</td>
            <td>Sesja / krótki</td>
          </tr>
          <tr>
            <td>web_rt</td>
            <td>Odświeża zalogowanie (token odświeżający)</td>
            <td>Niezbędny</td>
            <td>~30 dni</td>
          </tr>
          <tr>
            <td>cart_session</td>
            <td>Zapamiętuje koszyk gościa między wizytami</td>
            <td>Niezbędny</td>
            <td>30 dni</td>
          </tr>
          <tr>
            <td>NEXT_LOCALE</td>
            <td>Zapamiętuje wybór języka</td>
            <td>Funkcjonalny</td>
            <td>~1 rok</td>
          </tr>
        </tbody>
      </table>

      <h2 id="analytics">Analityka i marketing</h2>
      <p>
        Obecnie <strong>nie</strong> używamy plików cookie analitycznych ani marketingowych. Nasza
        analityka działa po stronie serwera i nie ustawia plików cookie, a mapa lokalizacji korzysta
        z OpenStreetMap, który nie ustawia plików śledzących. Ponieważ używamy wyłącznie
        niezbędnych/funkcjonalnych plików cookie, baner zgody na cookie nie jest wymagany. Jeśli
        kiedykolwiek dodamy pliki inne niż niezbędne, najpierw poprosimy o Twoją zgodę.
      </p>

      <h2 id="managing">Zarządzanie plikami cookie</h2>
      <p>
        Możesz usuwać lub blokować pliki cookie w ustawieniach przeglądarki. Pamiętaj, że
        zablokowanie niezbędnych plików cookie uniemożliwi logowanie i działanie koszyka.
      </p>

      <h2 id="more">Więcej informacji</h2>
      <p>
        Sposób przetwarzania danych osobowych opisuje nasza{' '}
        <Link href="/privacy">Polityka Prywatności</Link>. Data „ostatniej aktualizacji” powyżej
        wskazuje aktualną wersję.
      </p>
    </>
  );
}
