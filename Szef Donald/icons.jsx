/* ============================================================
   Icons + Logo
   ============================================================ */

const Icon = ({ name, size = 20, stroke = 1.75, ...props }) => {
  // Defensively re-strip name/stroke in case our compile environment
  // re-injects them into the rest props (it does, via babel source-map metadata).
  const { name: _omitName, stroke: _omitStroke, ...rest } = props;
  const s = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    bag: <><path d="M6 7h12l-1.2 12.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L6 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></>,
    menu: <><path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/></>,
    close: <><path d="M6 6l12 12"/><path d="M18 6L6 18"/></>,
    plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    arrowRight: <><path d="M5 12h14"/><path d="m13 5 7 7-7 7"/></>,
    arrowUpRight: <><path d="M7 17 17 7"/><path d="M8 7h9v9"/></>,
    phone: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/></>,
    nav: <><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.4 7 12 7 12s1 .7 2 0c0 0 7-6.6 7-12a8 8 0 0 0-8-8Z"/></>,
    share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4"/><path d="m15.4 6.5-6.8 4"/></>,
    check: <path d="M5 12.5 10 17.5 19 7.5"/>,
    star: <path d="M12 2.5l2.9 6.5 7.1.6-5.4 4.7 1.6 6.9L12 17.7l-6.2 3.5 1.6-6.9L2 9.6l7.1-.6L12 2.5Z" fill="currentColor" stroke="none"/>,
    starHalf: <><defs><linearGradient id="half"><stop offset="50%" stopColor="currentColor"/><stop offset="50%" stopColor="transparent"/></linearGradient></defs><path d="M12 2.5l2.9 6.5 7.1.6-5.4 4.7 1.6 6.9L12 17.7l-6.2 3.5 1.6-6.9L2 9.6l7.1-.6L12 2.5Z" fill="url(#half)" stroke="currentColor" strokeWidth="1.5"/></>,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></>,
    facebook: <path d="M14 9h3V5h-3a4 4 0 0 0-4 4v2H7v4h3v6h4v-6h3l1-4h-4V9.5A.5.5 0 0 1 14.5 9H14Z"/>,
    tiktok: <><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></>,
    google: <><path d="M21 12.2c0-.7-.1-1.3-.2-2H12v3.8h5.1c-.2 1.2-.9 2.2-1.9 2.9v2.4h3.1c1.8-1.7 2.7-4.1 2.7-7.1Z" fill="#4285F4" stroke="none"/><path d="M12 21c2.6 0 4.7-.9 6.3-2.3l-3.1-2.4c-.9.6-2 .9-3.2.9-2.4 0-4.5-1.6-5.3-3.8H3.5v2.4A9 9 0 0 0 12 21Z" fill="#34A853" stroke="none"/><path d="M6.7 13.4c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7H3.5a9 9 0 0 0 0 8.1l3.2-1.7Z" fill="#FBBC05" stroke="none"/><path d="M12 6c1.4 0 2.6.5 3.6 1.4l2.7-2.7C16.7 3.4 14.6 2.5 12 2.5A9 9 0 0 0 3.5 7.5l3.2 2.4C7.5 7.6 9.6 6 12 6Z" fill="#EA4335" stroke="none"/></>,
    leaf: <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.3c1.2 6.5-1.5 13.5-8.2 17.7Z"/>,
    chili: <><path d="M14 5c-2 1-4 4-5 8s-2 6-5 8c4 0 8-2 11-6 2-3 2-7 2-7s-1-3-3-3Z"/><path d="M14 5c0-1 1-2 2-2s2 1 2 2"/></>,
    flame: <path d="M12 2s4 5 4 9a4 4 0 1 1-8 0c0-2 1-3 2-4-1 4 2 6 2 6s-2-4 0-7c0-2-1-4 0-4Z"/>,
    wheat: <><path d="M12 22V8"/><path d="M12 8c-2-2-4-2-4-2s0 2 2 4 4 2 4 2"/><path d="M12 8c2-2 4-2 4-2s0 2-2 4-4 2-4 2"/><path d="M12 14c-2-2-4-2-4-2s0 2 2 4 4 2 4 2"/><path d="M12 14c2-2 4-2 4-2s0 2-2 4-4 2-4 2"/></>,
  };
  return <svg {...s} {...rest}>{paths[name]}</svg>;
};

/* Brand logo — hexagonal copper mark + wordmark */
const Logo = ({ variant = "full", size = 40 }) => {
  const isInverse = variant === "inverse";
  const accent = "rgb(var(--accent))";
  const Hex = (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="copper-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D9551E"/>
          <stop offset="50%" stopColor="#C2410C"/>
          <stop offset="100%" stopColor="#9A330A"/>
        </linearGradient>
      </defs>
      <polygon points="32,2 58,17 58,47 32,62 6,47 6,17" fill="url(#copper-g)"/>
      <polygon points="32,7 53.5,19.5 53.5,44.5 32,57 10.5,44.5 10.5,19.5" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
      {/* "SD" monogram in serif */}
      <text x="32" y="40" textAnchor="middle"
            fontFamily="Fraunces, Georgia, serif"
            fontSize="24" fontWeight="600"
            fill="white" letterSpacing="-0.02em">SD</text>
      {/* tiny "EST. 2014" arc */}
      <text x="32" y="51" textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontSize="4.5" fontWeight="600"
            fill="rgba(255,255,255,0.7)" letterSpacing="0.3em">EST · 2014</text>
    </svg>
  );
  if (variant === "mark") return Hex;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
      {Hex}
      <span style={{
        fontFamily: "var(--font-display)",
        fontSize: size >= 36 ? 22 : 20,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        color: isInverse ? "rgb(var(--surface))" : "rgb(var(--text-primary))",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}>Szef Donald</span>
    </span>
  );
};

/* Stars row */
const Stars = ({ rating, size = 16, gap = 2 }) => {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span style={{ display: "inline-flex", gap, color: "rgb(var(--accent))" }} aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => {
        if (i < full) return <Icon key={i} name="star" size={size} />;
        if (i === full && half) return <Icon key={i} name="starHalf" size={size} />;
        return <Icon key={i} name="star" size={size} style={{ color: "rgb(var(--text-disabled))" }} />;
      })}
    </span>
  );
};

/* Format money — shared with admin (mock) */
const formatMoney = (amount, currency) => {
  // For PLN render as `24,00 zł` per Polish convention
  const v = amount.toFixed(2).replace(".", ",");
  if (currency === "PLN") return `${v} zł`;
  return `${v} ${currency}`;
};

Object.assign(window, { Icon, Logo, Stars, formatMoney });
