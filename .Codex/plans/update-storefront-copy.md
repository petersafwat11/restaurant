# Update storefront copy with client text

Client sent new Polish marketing copy for the homepage + About page.
Decisions confirmed by owner: **verbatim (cleaned typos only)**, **translate en twins too**.
No component code changes — locale JSON only.

## Files touched (4)

- `packages/i18n/messages/pl/web/marketing/home.json`
- `packages/i18n/messages/en/web/marketing/home.json`
- `packages/i18n/messages/pl/web/marketing/about.json`
- `packages/i18n/messages/en/web/marketing/about.json`

## home.json changes

### `hero.description` (rendered at hero.tsx:20)

| Locale | New value |
| --- | --- |
| pl | Dokładamy wszelkich starań, aby nasz kebab był smaczny, świeży i doceniany przez klientów. |
| en | We do our best to make our kebab tasty, fresh and appreciated by our customers. |

Replaces the longer existing hero blurb (falafel/bread details move out).

### `featured.description` (section header support line, featured-dishes.tsx:91)

| Locale | New value |
| --- | --- |
| pl | Dania często zamawiane przez klientów. |
| en | Dishes often ordered by our customers. |

`featured.title` stays as-is ("Ulubione dania naszych gości") — client line reads as the subheader under it.

### `story.*` (story.tsx:23–34)

Heading renders as two lines joined by `<br />`, so the client's single line
"Przygotowywane na miejscu." is split across `titleLine1` / `titleLine2`.

| Key | pl | en |
| --- | --- | --- |
| `story.titleLine1` | Przygotowywane | Prepared |
| `story.titleLine2` | na miejscu. | on site. |
| `story.lead` | Kebab przygotowywany na miejscu ze świeżych składników. | Kebab prepared on site from fresh ingredients. |
| `story.body` | Mały lokal w Kielcach na Ściegiennego 68a. | A small place in Kielce, at Ściegiennego 68a. |

Note: added a closing period to the lead (client omitted it) for consistency.

Unchanged: `story.eyebrow` = "Nasza historia" (matches "NASZA HISTORIA" — CSS uppercases),
`story.readMore` = "Przeczytaj całą historię" ✅ verbatim already,
stats/labels/imageAlt.

## about.json changes

Full-story body replaced by the client's closing pitch, split across the three
existing paragraphs (what `/about` shows after "Przeczytaj całą historię").

| Key | pl | en |
| --- | --- | --- |
| `paragraph1` | Wszystko przygotowywane na świeżo w ciągu dnia. | Everything is prepared fresh throughout the day. |
| `paragraph2` | Kameralny lokal prowadzony od 2019. | A cosy little place, run since 2019. |
| `paragraph3` | Mamy nadzieję gościć Cię w naszych progach. Zapraszamy! | We hope to welcome you through our doors. See you soon! |

Unchanged: `eyebrow`, `title`, `description`, `imageAlt`, `stats`.

## Cleanup applied to client text

- "swiezych" → "świeżych"
- Trailing period added to the story lead
- Everything else verbatim

## Verification

1. `pnpm --filter @repo/i18n test` (if present) or typecheck — JSON keys unchanged, only values.
2. Run web dev server, visually compare `/` and `/about` (pl + en) against `design-assets` previews.
3. No tests assert these strings (confirmed earlier), so nothing should break.
