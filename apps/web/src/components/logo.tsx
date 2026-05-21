/**
 * Szef Donald brand logo — hexagonal copper mark + wordmark.
 *
 * Three variants:
 *  - 'full' (default): mark + "Szef Donald" wordmark in espresso text.
 *  - 'mark': hexagon only — used in tight spots (mobile nav, favicon-ish).
 *  - 'inverse': mark + wordmark in cream text — for use on dark surfaces
 *    (footer over espresso bg).
 *
 * The copper gradient inside the mark is hardcoded brand color (not a token).
 * The wordmark text color reads from semantic tokens so it adapts if the
 * surrounding theme changes.
 */

interface LogoProps {
  variant?: 'full' | 'mark' | 'inverse';
  size?: number;
  className?: string;
}

export function Logo({ variant = 'full', size = 40, className }: LogoProps) {
  const hex = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      role="presentation"
      className="shrink-0"
    >
      <title>Szef Donald</title>
      <defs>
        <linearGradient id="szef-copper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D9551E" />
          <stop offset="50%" stopColor="#C2410C" />
          <stop offset="100%" stopColor="#9A330A" />
        </linearGradient>
      </defs>
      <polygon points="32,2 58,17 58,47 32,62 6,47 6,17" fill="url(#szef-copper)" />
      <polygon
        points="32,7 53.5,19.5 53.5,44.5 32,57 10.5,44.5 10.5,19.5"
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1"
      />
      <text
        x="32"
        y="40"
        textAnchor="middle"
        fontFamily="var(--font-display), Fraunces, Georgia, serif"
        fontSize="24"
        fontWeight={600}
        fill="white"
        letterSpacing="-0.02em"
      >
        SD
      </text>
      <text
        x="32"
        y="51"
        textAnchor="middle"
        fontFamily="var(--font-body), Inter, sans-serif"
        fontSize="4.5"
        fontWeight={600}
        fill="rgba(255,255,255,0.7)"
        letterSpacing="0.3em"
      >
        EST · 2014
      </text>
    </svg>
  );

  if (variant === 'mark') return <span className={className}>{hex}</span>;

  const wordmarkColorClass = variant === 'inverse' ? 'text-surface' : 'text-fg';

  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ''}`}>
      {hex}
      <span
        className={`whitespace-nowrap font-display font-semibold leading-none tracking-tight ${wordmarkColorClass}`}
        style={{ fontSize: size >= 36 ? 22 : 20 }}
      >
        Szef Donald
      </span>
    </span>
  );
}
