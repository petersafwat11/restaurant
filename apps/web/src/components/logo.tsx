/**
 * Szef Donald brand logo — circular emblem (gold disc, fork/spoon mark).
 *
 * Two variants:
 *  - 'full' (default): emblem + "Szef Donald" wordmark. Used in the site + auth headers.
 *  - 'mark': emblem only. Used everywhere else (footer, hero) and as the favicon source.
 *
 * The emblem is a transparent PNG served from /logo.png, so it sits cleanly on any
 * surface (light header or dark footer). Width and height are set explicitly so a
 * flex-column parent's `align-items: stretch` can't distort it (that once bit the footer).
 */

interface LogoProps {
  variant?: 'full' | 'mark';
  size?: number;
  className?: string;
}

export function Logo({ variant = 'full', size = 40, className }: LogoProps) {
  const emblem = (
    // eslint-disable-next-line @next/next/no-img-element -- matches the app's <img> convention; no next/image in use
    <img
      src="/logo.png"
      alt={variant === 'mark' ? 'Szef Donald' : ''}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="block shrink-0 select-none"
      draggable={false}
    />
  );

  if (variant === 'mark') return <span className={className}>{emblem}</span>;

  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ''}`}>
      {emblem}
      <span
        className="whitespace-nowrap font-display font-semibold leading-none tracking-tight text-fg"
        style={{ fontSize: size >= 36 ? 22 : 20 }}
      >
        Szef Donald
      </span>
    </span>
  );
}
