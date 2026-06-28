import type { CompanyInfo } from './company';

const LABELS = {
  pl: { registeredOffice: 'Adres rejestrowy', shareCapital: 'Kapitał zakładowy' },
  en: { registeredOffice: 'Registered office', shareCapital: 'Share capital' },
} as const;

/**
 * Seller / data-controller identity block shared by the Terms (Sprzedawca) and
 * Privacy (administrator danych) pages. Every value is sourced from the DB legal
 * block and rendered only when present — there are never placeholder tokens.
 */
export function SellerIdentity({ c, locale }: { c: CompanyInfo; locale: 'pl' | 'en' }) {
  const labels = LABELS[locale];
  const ids = [
    c.nip ? `NIP ${c.nip}` : null,
    c.krs ? `KRS ${c.krs}` : null,
    c.regon ? `REGON ${c.regon}` : null,
  ].filter((x): x is string => x !== null);

  return (
    <p>
      <strong>{c.displayName}</strong>
      <br />
      {c.tradingAddressLines.map((l) => (
        <span key={l}>
          {l}
          <br />
        </span>
      ))}
      {c.registeredAddressLines && (
        <>
          <span className="text-fg-muted">
            {labels.registeredOffice}: {c.registeredAddressLines.join(', ')}
          </span>
          <br />
        </>
      )}
      {ids.length > 0 && (
        <>
          {ids.join(' · ')}
          <br />
        </>
      )}
      {c.registryCourt && (
        <>
          {c.registryCourt}
          <br />
        </>
      )}
      {c.shareCapital && (
        <>
          {labels.shareCapital}: {c.shareCapital}
          {c.shareCapitalCurrency ? ` ${c.shareCapitalCurrency}` : ''}
          <br />
        </>
      )}
      {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
      {c.phone ? ` · ${c.phone}` : ''}
    </p>
  );
}
