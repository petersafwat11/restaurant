import { Link } from '@/i18n/navigation';
import type { ReactNode } from 'react';
import { INLINE_LINK_RE } from '../seo-vars';

/**
 * Renders SEO copy with inline-link markup (see `INLINE_LINK_RE`):
 * `[anchor text](/internal-path)` becomes a locale-aware <Link>. Only
 * root-relative internal paths are recognised, so copy can't smuggle in
 * arbitrary external URLs. Everything else is rendered as plain text.
 */
export function RichText({ text }: { text: string }): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_LINK_RE)) {
    const [whole, label, href] = m;
    const start = m.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    out.push(
      <Link
        key={`${start}-${href}`}
        href={href as string}
        className="font-medium text-accent-hover underline underline-offset-2 hover:text-accent"
      >
        {label}
      </Link>,
    );
    last = start + whole.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
