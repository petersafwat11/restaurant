/**
 * Server-Component JSON-LD emitter.
 *
 * `<JsonLd>` renders a single `<script type="application/ld+json">` from a
 * plain object (or an array of nodes, which become an `@graph`). Use it in any
 * Server Component — no `'use client'`, zero hydration cost. Node builders
 * live in `./schema.ts`.
 */

type JsonLdValue = Record<string, unknown> | Record<string, unknown>[];

interface JsonLdProps {
  data: JsonLdValue;
  /** Optional id, useful when emitting multiple blocks on one page. */
  id?: string;
}

/**
 * Escapes the only sequence that can break out of a `<script>` block.
 * `<\/` is treated as `</` by HTML parsers but is opaque to JSON parsers, so
 * round-tripping is safe.
 */
function safeStringify(data: JsonLdValue): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function JsonLd({ data, id }: JsonLdProps) {
  const payload = Array.isArray(data)
    ? { '@context': 'https://schema.org', '@graph': data }
    : data['@context']
      ? data
      : { '@context': 'https://schema.org', ...data };

  return (
    <script
      id={id}
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires raw script content; payload is JSON-encoded with `<` escaped.
      dangerouslySetInnerHTML={{ __html: safeStringify(payload) }}
    />
  );
}
