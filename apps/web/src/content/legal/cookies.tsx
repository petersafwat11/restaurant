import type { LegalSection } from '@/features/legal/legal-toc';
import { Link } from '@/i18n/navigation';

/**
 * Versioned source for the Cookie / similar-technology notice (plan §D8).
 * Relocated out of the page TSX with an identical PL/EN section list.
 *
 * D8 corrections applied here:
 *  - lists the EXACT first-party mechanisms actually used (verified by grepping
 *    the codebase): `web_at`, `web_rt`, `cart_session`, `NEXT_LOCALE`.
 *  - discloses that our payment provider (eService) may set cookies on its own
 *    hosted payment page during an online payment, and links to its cookie info.
 *  - does NOT hardcode a consent-banner decision. The previous copy asserted
 *    "no cookie-consent banner is required"; that decision belongs to counsel
 *    under current Polish PKE + GDPR after a clean-browser audit. A clearly
 *    marked TODO is left instead.
 */

export const COOKIES_SECTIONS: LegalSection[] = [
  { id: 'first-party', pl: 'Nasze pliki cookie (first-party)', en: 'Our cookies (first-party)' },
  {
    id: 'payment',
    pl: 'Pliki cookie płatności (eService)',
    en: 'Payment cookies (eService)',
  },
  { id: 'analytics', pl: 'Analityka i marketing', en: 'Analytics & marketing' },
  { id: 'consent', pl: 'Zgoda na pliki cookie', en: 'Cookie consent' },
  { id: 'managing', pl: 'Zarządzanie plikami cookie', en: 'Managing cookies' },
  { id: 'more', pl: 'Więcej informacji', en: 'More information' },
];

export function CookiesEN() {
  return (
    <>
      <p>
        Cookies (and similar technologies such as local storage) are small pieces of data stored on
        your device. This page lists the cookies we set ourselves and the cookies that our payment
        provider may set on its own secure payment page during an online payment.
      </p>

      <h2 id="first-party">Our cookies (first-party)</h2>
      <p>
        These are strictly necessary or functional cookies set by our own site. They are not used
        for advertising.
      </p>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Purpose</th>
            <th>Type</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>web_at</code>
            </td>
            <td>Keeps you signed in (access token)</td>
            <td>Strictly necessary</td>
            <td>Short-lived (~15 minutes)</td>
          </tr>
          <tr>
            <td>
              <code>web_rt</code>
            </td>
            <td>Renews your session securely (refresh token)</td>
            <td>Strictly necessary</td>
            <td>Up to ~30 days</td>
          </tr>
          <tr>
            <td>
              <code>cart_session</code>
            </td>
            <td>Remembers a guest cart between visits</td>
            <td>Strictly necessary</td>
            <td>30 days</td>
          </tr>
          <tr>
            <td>
              <code>NEXT_LOCALE</code>
            </td>
            <td>Remembers your language choice</td>
            <td>Functional</td>
            <td>~1 year</td>
          </tr>
        </tbody>
      </table>

      <h2 id="payment">Payment cookies (eService)</h2>
      <p>
        When you pay online, you are redirected to the secure hosted payment page of our payment
        provider, <strong>eService</strong> (part of Global Payments). Any cookies needed to process
        the payment and prevent fraud are set by eService on that page, under their own cookie
        policy — not by us, and only in connection with a payment.{' '}
        {/* LAWYER: confirm the eService / Global Payments cookie disclosure and link to their
        cookie policy after the sandbox/live audit. */}
      </p>

      <h2 id="analytics">Analytics &amp; marketing</h2>
      <p>
        We do not use advertising cookies. Our location map uses OpenStreetMap, which does not set
        tracking cookies. Product analytics and error monitoring (PostHog / Sentry) are server-side
        and are only used if enabled in production; if enabled in a way that sets device storage, it
        will be classified and disclosed here.{' '}
        {/* LAWYER: classify any analytics storage under PKE
        + GDPR after the audit. */}
      </p>

      <h2 id="consent">Cookie consent</h2>
      <p>
        {/* TODO (LAWYER): The cookie-consent decision (banner vs. no banner, and granular
        opt-in for any non-essential storage) must be made by counsel under the current Polish
        Electronic Communications Law (PKE) and the GDPR, following a clean-browser storage/network
        audit with card, BLIK and Link on/off and PostHog/Sentry on/off (plan §D8). Do NOT publish a
        banner/no-banner claim until that decision is recorded. */}
        Strictly necessary cookies (sign-in and cart) are required for the site to work. If any
        non-essential storage is introduced, we will ask for your consent first, with an equally
        easy way to decline.
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

export function CookiesPL() {
  return (
    <>
      <p>
        Pliki cookie (oraz podobne technologie, np. pamięć lokalna) to małe dane zapisywane na Twoim
        urządzeniu. Ta strona wymienia pliki cookie, które ustawiamy sami, oraz pliki cookie, które
        nasz dostawca płatności może ustawić podczas płatności online.
      </p>

      <h2 id="first-party">Nasze pliki cookie (first-party)</h2>
      <p>
        Są to niezbędne lub funkcjonalne pliki cookie ustawiane przez naszą stronę. Nie służą do
        celów reklamowych.
      </p>
      <table>
        <thead>
          <tr>
            <th>Nazwa</th>
            <th>Cel</th>
            <th>Rodzaj</th>
            <th>Czas</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>web_at</code>
            </td>
            <td>Utrzymuje zalogowanie (token dostępu)</td>
            <td>Niezbędny</td>
            <td>Krótkotrwały (~15 minut)</td>
          </tr>
          <tr>
            <td>
              <code>web_rt</code>
            </td>
            <td>Bezpiecznie odnawia sesję (token odświeżania)</td>
            <td>Niezbędny</td>
            <td>Do ~30 dni</td>
          </tr>
          <tr>
            <td>
              <code>cart_session</code>
            </td>
            <td>Zapamiętuje koszyk gościa między wizytami</td>
            <td>Niezbędny</td>
            <td>30 dni</td>
          </tr>
          <tr>
            <td>
              <code>NEXT_LOCALE</code>
            </td>
            <td>Zapamiętuje wybór języka</td>
            <td>Funkcjonalny</td>
            <td>~1 rok</td>
          </tr>
        </tbody>
      </table>

      <h2 id="payment">Pliki cookie płatności (eService)</h2>
      <p>
        Podczas płatności online zostajesz przekierowany na bezpieczną stronę płatności naszego
        dostawcy płatności, <strong>eService</strong> (część Global Payments). Wszelkie pliki cookie
        potrzebne do obsłużenia płatności i zapobiegania nadużyciom są ustawiane przez eService na
        tej stronie, zgodnie z ich własną polityką cookie — a nie przez nas i wyłącznie w związku z
        płatnością.{' '}
        {/* LAWYER: potwierdź informację o cookie eService / Global Payments i link do ich polityki
        cookie po audycie sandbox/live. */}
      </p>

      <h2 id="analytics">Analityka i marketing</h2>
      <p>
        Nie używamy reklamowych plików cookie. Nasza mapa lokalizacji korzysta z OpenStreetMap,
        który nie ustawia plików śledzących. Analityka produktowa i monitoring błędów (PostHog /
        Sentry) działają po stronie serwera i są używane wyłącznie, jeśli włączone w produkcji;
        jeśli zostaną włączone w sposób ustawiający dane na urządzeniu, zostanie to tu
        sklasyfikowane i ujawnione.{' '}
        {/* LAWYER: sklasyfikuj ewentualną pamięć analityczną wg PKE +
        RODO po audycie. */}
      </p>

      <h2 id="consent">Zgoda na pliki cookie</h2>
      <p>
        {/* TODO (LAWYER): Decyzję o zgodzie na pliki cookie (baner czy brak banera oraz
        granularny opt-in dla danych innych niż niezbędne) musi podjąć prawnik na podstawie aktualnej
        ustawy Prawo komunikacji elektronicznej (PKE) i RODO, po audycie pamięci/sieci w czystej
        przeglądarce z kartą, BLIK i Link wł./wył. oraz PostHog/Sentry wł./wył. (plan §D8). Nie
        publikuj twierdzenia o banerze/braku banera, dopóki ta decyzja nie zostanie zapisana. */}
        Niezbędne pliki cookie (logowanie i koszyk) są wymagane do działania serwisu. Jeśli
        wprowadzimy pamięć inną niż niezbędna, najpierw poprosimy o Twoją zgodę, z równie łatwą
        możliwością odmowy.
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
