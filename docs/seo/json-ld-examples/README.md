# JSON-LD Examples — reference for the UI sprint

Hand-validated examples for each page type. Paste any into Google's
[Rich Results Test](https://search.google.com/test/rich-results) or the
[Schema.org Validator](https://validator.schema.org) to verify before
copy-pasting into a page's JSON-LD.

Replace `https://example.com` with `process.env.NEXT_PUBLIC_APP_URL` and
substitute live data from the relevant DTOs at render time. None of these are
runtime; they're the contract the UI components emit.

| File | Page | Source DTOs |
|---|---|---|
| [restaurant.json](./restaurant.json) | Site-wide (every page, via marketing layout) | `RestaurantPublicDto` |
| [website-with-search.json](./website-with-search.json) | `/` (home) | static + restaurant name |
| [menu-graph.json](./menu-graph.json) | `/menu` | from `/seo/structured-data/:slug` endpoint |
| [menu-item-with-offer.json](./menu-item-with-offer.json) | `/menu/[cat]/[item]` | `MenuItemDetailDto` |
| [breadcrumbs.json](./breadcrumbs.json) | Every deep page | derived from route |
| [faq-page.json](./faq-page.json) | `/faq` (FAQ rich result deprecated 2026-05-07 but still AI-extractable) | static content |
| [aggregate-rating.json](./aggregate-rating.json) | Home + `/about` once reviews surface | derived from reviews aggregate |
| [reservation-action.json](./reservation-action.json) | `/reservations` | static |
