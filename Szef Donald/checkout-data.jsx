/* ============================================================
   Checkout mock data + brand SVGs (payment logos, success mark)
   ============================================================ */

const mockAddressAutocomplete = [
  { street: "Marszałkowska 102",        city: "Warszawa", postalCode: "00-026", country: "PL" },
  { street: "Marszałkowska 87",         city: "Warszawa", postalCode: "00-683", country: "PL" },
  { street: "Nowy Świat 18",            city: "Warszawa", postalCode: "00-373", country: "PL" },
  { street: "Aleje Jerozolimskie 65",   city: "Warszawa", postalCode: "00-697", country: "PL" },
  { street: "Krakowskie Przedmieście 23", city: "Warszawa", postalCode: "00-071", country: "PL" },
  { street: "Świętokrzyska 12",         city: "Warszawa", postalCode: "00-052", country: "PL" },
  { street: "Plac Defilad 1",           city: "Warszawa", postalCode: "00-901", country: "PL" },
  { street: "Plac Trzech Krzyży 8",     city: "Warszawa", postalCode: "00-535", country: "PL" },
  { street: "Aleja Niepodległości 142", city: "Warszawa", postalCode: "02-554", country: "PL" },
];

const mockDeliveryConfig = {
  feeAmount: 5,            // 5 zł
  freeOverAmount: 80,      // free over 80 zł
  earliestSlotMinutes: 20,
};
const mockPickupConfig = {
  location: { name: "Szef Donald", address1: "Marszałkowska 102", address2: "00-026 Warszawa", phone: "+48 22 555 01 23" },
  earliestSlotMinutes: 10,
};
const mockPromoCodes = {
  BAKLAVA: { discountPercent: 15, label: "15% off — first order" },
  STUDENT: { discountAmount: 5,   label: "5,00 zł off" },
};

/* ---------- Payment-method logo SVGs ---------- */
const PaymentLogos = ({ size = 18 }) => (
  <div className="payment-logos" aria-hidden="true">
    {/* Visa */}
    <svg className="payment-logo" height={size} viewBox="0 0 48 16">
      <text x="0" y="13" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="14" fontStyle="italic" fill="#1A1F71" letterSpacing="-0.02em">VISA</text>
    </svg>
    {/* Mastercard */}
    <svg className="payment-logo" height={size} viewBox="0 0 30 18">
      <circle cx="11" cy="9" r="7" fill="#EB001B"/>
      <circle cx="19" cy="9" r="7" fill="#F79E1B"/>
      <path d="M15 4a7 7 0 0 0 0 10 7 7 0 0 0 0-10Z" fill="#FF5F00"/>
    </svg>
    {/* BLIK */}
    <svg className="payment-logo" height={size} viewBox="0 0 36 16">
      <text x="0" y="13" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="14" fill="#000">BLIK</text>
    </svg>
    {/* Apple Pay */}
    <svg className="payment-logo" height={size} viewBox="0 0 42 16">
      <path d="M7.5 4.2c.4-.5.7-1.1.6-1.7-.5 0-1.1.4-1.5.8-.4.4-.7 1-.6 1.7.6 0 1.1-.3 1.5-.8ZM8 5.5c-.8 0-1.5.4-1.9.4-.4 0-1-.4-1.7-.4C3.4 5.6 2.4 6.5 2.4 8.4c0 1.2.4 2.4.9 3.1.4.6 1 1.4 1.6 1.4.6 0 .9-.4 1.7-.4.8 0 1 .4 1.7.4.7 0 1.1-.7 1.6-1.3.4-.6.7-1.3.8-1.8-1.2-.5-1.6-2-1.6-2C7.9 6.4 7 6.1 7 6.1Z" fill="#000"/>
      <text x="13" y="12" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="11" fill="#000">Pay</text>
    </svg>
    {/* Google Pay */}
    <svg className="payment-logo" height={size} viewBox="0 0 44 16">
      <text x="0" y="12" fontFamily="Inter, sans-serif" fontWeight="500" fontSize="11" fill="#5F6368">G</text>
      <text x="8" y="12" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="11" fill="#5F6368">Pay</text>
    </svg>
  </div>
);

/* ---------- Success checkmark hexagon ---------- */
const SuccessHexagonMark = ({ size = 96 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <linearGradient id="success-copper" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#D9551E"/>
        <stop offset="50%" stopColor="#C2410C"/>
        <stop offset="100%" stopColor="#9A330A"/>
      </linearGradient>
    </defs>
    <polygon points="32,2 58,17 58,47 32,62 6,47 6,17" fill="url(#success-copper)"/>
    <polygon points="32,7 53.5,19.5 53.5,44.5 32,57 10.5,44.5 10.5,19.5" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
    <path d="M20 32 L29 41 L46 24" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

/* ---------- Payment-method-specific icons ---------- */
const PMIcon = ({ method }) => {
  if (method === "card") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="3"/>
      <line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  );
  if (method === "blik") return (
    <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 11, letterSpacing: "-0.02em" }}>BLIK</span>
  );
  if (method === "applepay") return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.5 12.5c0-2.2 1.8-3.3 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.4 0-2.8.8-3.5 2.1-1.5 2.6-.4 6.4 1.1 8.5.7 1 1.5 2.2 2.6 2.2 1 0 1.4-.7 2.7-.7 1.2 0 1.6.7 2.7.7 1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.3 1.2-2.3-.1 0-2.3-.9-2.3-3.5ZM14.6 6c.6-.7 1-1.7.9-2.7-.8 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6.9.1 1.9-.5 2.5-1.2Z"/>
    </svg>
  );
  if (method === "googlepay") return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 12.2c0-.7-.1-1.3-.2-2H12v3.8h5.1c-.2 1.2-.9 2.2-1.9 2.9v2.4h3.1c1.8-1.7 2.7-4.1 2.7-7.1Z" fill="#4285F4"/>
      <path d="M12 21c2.6 0 4.7-.9 6.3-2.3l-3.1-2.4c-.9.6-2 .9-3.2.9-2.4 0-4.5-1.6-5.3-3.8H3.5v2.4A9 9 0 0 0 12 21Z" fill="#34A853"/>
      <path d="M6.7 13.4c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7H3.5a9 9 0 0 0 0 8.1l3.2-1.7Z" fill="#FBBC05"/>
      <path d="M12 6c1.4 0 2.6.5 3.6 1.4l2.7-2.7C16.7 3.4 14.6 2.5 12 2.5A9 9 0 0 0 3.5 7.5l3.2 2.4C7.5 7.6 9.6 6 12 6Z" fill="#EA4335"/>
    </svg>
  );
  if (method === "cod") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <circle cx="12" cy="12" r="2.5"/>
      <path d="M6 12h.01M18 12h.01"/>
    </svg>
  );
  return null;
};

/* ---------- OrderType icons ---------- */
const OTIcon = ({ kind }) => {
  if (kind === "delivery") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
      <path d="M15 18H9"/>
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
      <circle cx="17" cy="18" r="2"/>
      <circle cx="7" cy="18" r="2"/>
    </svg>
  );
  if (kind === "pickup") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 7h12l-1.2 12.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L6 7Z"/>
      <path d="M9 7V5a3 3 0 0 1 6 0v2"/>
    </svg>
  );
  if (kind === "eatin") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v8a4 4 0 0 0 4 4v6"/>
      <path d="M7 3v8"/>
      <path d="M11 3v8a4 4 0 0 1-4 4"/>
      <path d="M19 3l-2 8v10"/>
    </svg>
  );
  return null;
};

Object.assign(window, {
  mockAddressAutocomplete, mockDeliveryConfig, mockPickupConfig, mockPromoCodes,
  PaymentLogos, SuccessHexagonMark, PMIcon, OTIcon,
});
