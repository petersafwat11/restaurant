# Admin dashboard: table search + CSV/PDF export

Status: **proposed — needs approval before implementation**.

## Goals

For every list/table page in the admin app:

1. **Debounced server-side search** across a whitelisted set of columns per resource. Fresh data on every keystroke (300 ms debounce), no client-side filtering.
2. **CSV + PDF export buttons** that download **all rows** matching the current filters and search (ignoring pagination). Click → file saves. No queue, no polling.

## Non-goals

- Not touching the existing `/reports/exports` analytics pipeline. That stays as-is for the 9 aggregated report kinds (sales-by-item, customer-retention, etc.). Per-table dumps are a separate concern.
- Not adding sort exports — sort order in the file matches the natural order of the list endpoint (usually `createdAt desc`).
- Not building a generic "search across the whole app" — search is per-table only.

## Architecture decisions (with reasoning)

| Decision | Choice | Why |
|---|---|---|
| Export transport | **Sync streaming endpoint per resource** (`GET /<resource>/export?format=…&…filters`) | UX is "click and save", not "queue and poll". Queue would force users through `/reports/exports` for a 200-row dump. Resource controllers already own the filter Zod schema and read permission — reuse them. |
| PDF library | **`pdfmake`** | High-level table layout, no Chromium. `pdfkit` is too low-level for tabular output; `puppeteer` is heavyweight for what's essentially `<table>` → PDF. |
| Row cap | **CSV 50,000 / PDF 1,000** — 413 + hint to use analytics exports if exceeded | CSV ≥50k is rare for an admin export and starts to hurt the request. PDFs over ~1k rows are unreadable anyway. |
| Search scope | **Every column displayed in the table is searchable** (per your decision). Per-column strategy varies by type — see "Search type strategy" below. | What you see is what you can search. Column visibility = column searchability is a clean mental model. |
| Search index strategy | **Plain `ILIKE` for v1**, note `pg_trgm + GIN` as a follow-up | At current scale (<100k rows per table) plain ILIKE on 2-4 string columns plus typed equality on enums/numbers is fine. Trigram indexes are a future optimization, not a launch blocker. |
| Debounce | **Shared `useDebouncedValue(value, 300)` hook**, replaces the duplicated 250ms inline debounces in orders + customers | One source of truth, consistent feel across tables. |
| Toolbar UI | **New `<TableToolbar>` primitive in `packages/ui`** — presentational, with slots for search, filters, export buttons | DataTable has no toolbar. PageHeader.rows works but every page reinvents the layout. A primitive standardizes spacing and a11y. |

## Search type strategy

The single search input issues **one query** to the server. The server ORs together one predicate per searchable column. The predicate shape depends on the column's underlying type:

| Underlying type | Predicate | Notes |
|---|---|---|
| **String** (name, email, comment, ip, subject, body, order number, action, resourceType, IDs) | `field ILIKE '%q%'` | Trim + escape `%` and `_` in the query before interpolation. |
| **Enum** (status, type, segment, moderationStatus, role) | If `q.toLowerCase()` matches the lowercase form of any enum value (whole or prefix), add `field IN (matchingValues)`. Otherwise the column contributes nothing. | Lets the user type "deliv" → matches `DELIVERY` + `delivered`. No `ILIKE` cast — keeps the index usable. |
| **Number** (rating, itemCount, lifetimeOrders) | If `Number(q)` is finite, add `field = parsed`. Otherwise the column contributes nothing. | Exact match. Searching "5" for rating finds 5-stars, not 15. |
| **Decimal / Money** (grandTotal, lifetimeSpend, minSubtotal, promotion value) | If `q` parses as a number, add `field = parsed`. Otherwise nothing. | Matches "12.50" → 12.50. Currency symbol/commas stripped first. |
| **Datetime** (createdAt, lastOrderAt, startsAt, endsAt, completedAt) | If `q` matches `/^\d{4}-\d{2}-\d{2}$/`, add `field >= q && field < q+1day` (whole-day window in the restaurant's timezone). Otherwise nothing. | Searching arbitrary date strings ("yesterday", "May 20") is out of scope — use the existing date filter UI for that. |
| **Boolean** (isActive, emailVerifiedAt-as-flag) | If `q` is `"active"`/`"enabled"`/`"true"` → `field = true`; if `"inactive"`/`"disabled"`/`"false"` → `field = false`. Otherwise nothing. | Lets a boolean column behave like a 2-value enum. |
| **Derived / computed** (status badge that combines `isActive`+`startsAt`+`endsAt`; orders "elapsed"; "Invited/Active/Disabled" badge from `emailVerifiedAt`+`isActive`) | Map each derived label to its underlying predicate. E.g., promotion `q="scheduled"` → `isActive=true AND startsAt > now()`. | Codified in a small `derived-predicates.ts` table per resource. If a label has no clean predicate, it sits out. |
| **UUID / opaque ID** (resourceId, actorUserId rendered as monospace) | `field = q` only if `q` is a full UUID. Otherwise `field::text ILIKE '%q%'` is opt-in per resource — default off because it's slow. | Audit-log shows raw IDs; users do paste full IDs occasionally. Keep this opt-in. |

**Empty contribution rule:** if no column contributes a predicate (e.g. user types gibberish that's not a number, date, or substring of any enum), the search still issues an ILIKE across all string columns. That's the baseline fallback so the user never gets the surprising "I typed something and got everything back" behavior.

**Escape rule:** before any ILIKE, escape `%`, `_`, and `\` in the user's input to literals.

**Performance note:** the resulting `WHERE` clause can be 6-10 OR'd predicates. At <100k rows per table this stays under ~50ms with no extra indexes. Add B-tree indexes on the most-used string columns (`Customer.email`, `Order.number`) as part of this change. Trigram indexes deferred to follow-up.

## Per-table contract

Every UI column → underlying field(s) → search strategy. **Veto specific cells before I start.**

### `/orders` (permission: `order:read`)

| UI column | DB field(s) | Search type | Export |
|---|---|---|---|
| Order # | `Order.number` | String ILIKE | ✅ |
| Customer | `User.firstName + lastName`, `User.email` (avatar derived) | String ILIKE (concat name; OR email) | name, email |
| Items | `_count.items` (computed) | Number `=` | ✅ |
| Type | `Order.type` enum (DELIVERY/PICKUP/DINE_IN) | Enum prefix match | ✅ |
| Status | `Order.status` enum | Enum prefix match | ✅ |
| Total | `Order.grandTotal` (Decimal) | Decimal `=` | ✅ |
| Placed | `Order.createdAt` | Datetime (yyyy-mm-dd whole day) | ✅ |
| Elapsed | derived from `createdAt` | sits out — same field as Placed | (PDF: omit) |
| Actions | — | n/a | n/a |

### `/customers` (permission: `customer:read`)

| UI column | DB field(s) | Search type | Export |
|---|---|---|---|
| Customer | `firstName`, `lastName`, `email` | String ILIKE on each | ✅ |
| Phone | `phone` | String ILIKE | ✅ |
| Orders | `lifetimeOrders` | Number `=` | ✅ |
| Lifetime spend | `lifetimeSpend` (Decimal) | Decimal `=` | ✅ |
| Last order | `lastOrderAt` | Datetime whole-day | ✅ |
| Segment | computed enum (vip/frequent/dormant/new/active) | Enum prefix match | ✅ |

### `/reviews` (permission: `review:moderate`)

| UI column | DB field(s) | Search type | Export |
|---|---|---|---|
| Rating | `rating` (1-5) | Number `=` | ✅ |
| Customer | `author.firstName + lastName` (or "Anonymous") | String ILIKE | ✅ |
| Comment | `comment` | String ILIKE | ✅ |
| Status | `moderationStatus` enum (PUBLISHED/HIDDEN/FLAGGED) | Enum prefix match | ✅ |
| Reply | `ownerReply` (nullable) | Boolean-ish: "replied"/"unreplied" map to `IS NOT NULL` / `IS NULL` | ✅ (text) |
| Posted | `createdAt` | Datetime whole-day | ✅ |

### `/audit-log` (permission: `audit:read`)

| UI column | DB field(s) | Search type | Export |
|---|---|---|---|
| When | `createdAt` | Datetime whole-day | ✅ |
| Actor | `actorUserId` (monospace) | UUID equality (opt-in `::text ILIKE` for partial) | ✅ |
| Action | `action` (string like "order.update") | String ILIKE | ✅ |
| Resource | `resourceType`, `resourceId` | String ILIKE on type; UUID eq on id | ✅ both |
| IP | `ip` | String ILIKE | ✅ |

### `/contact` (permission: `contact:read`)

| UI column | DB field(s) | Search type | Export |
|---|---|---|---|
| Subject | `subject`, `message` (preview) | String ILIKE on each | ✅ both |
| From | `name`, `email` | String ILIKE on each | ✅ both |
| Status | `status` enum (new/read/archived) | Enum prefix match | ✅ |
| Received | `createdAt` | Datetime whole-day | ✅ |

### `/staff` (permission: `staff:read`)

| UI column | DB field(s) | Search type | Export |
|---|---|---|---|
| Name | `user.firstName`, `user.lastName`, `user.email` | String ILIKE on each | ✅ |
| Phone | `user.phone` | String ILIKE | ✅ |
| Role | `roleKeys[0]` enum | Enum prefix match | ✅ |
| Status | derived from `emailVerifiedAt` + `isActive` ("Invited"/"Active"/"Disabled") | Derived predicate map | ✅ (text label) |
| Added | `createdAt` | Datetime whole-day | ✅ |
| Actions | — | n/a | n/a |

### `/promotions` (permission: `promotion:read`)

| UI column | DB field(s) | Search type | Export |
|---|---|---|---|
| Name | `name`, `description` (preview) | String ILIKE on each | ✅ both |
| Type | `type` enum (PERCENT/FIXED/BOGO/FREE_DELIVERY) | Enum prefix match | ✅ |
| Value | `value` (Decimal) | Decimal `=` | ✅ |
| Window | `startsAt`, `endsAt` | Datetime whole-day on each (matches if q falls in window OR equals either boundary) | ✅ both |
| Min | `minSubtotal` (Decimal) | Decimal `=` | ✅ |
| Status | derived: DRAFT / SCHEDULED / ACTIVE / EXPIRED / PAUSED from `isActive` + `startsAt` + `endsAt` | Derived predicate map | ✅ (text label) |

### Out of scope this round

| Page | Reason |
|---|---|
| `/reservations` | Custom HTML table + calendar, not DataTable. Confirmed skip. Migration is a separate task. |
| `/locations` | Single-record screen, not a list. |
| `/reports/exports` | This *is* the analytics exports list; exporting the export list is meta-noise. |
| `/settings/*` | Config screens, not data tables. |

---

## Backend plan

### B1 — shared infrastructure

- `packages/types/src/common.ts` (or new `table-export.ts`):
  - Add `TableExportFormatSchema = z.enum(['csv', 'pdf'])` and `TableExportQueryBase = z.object({ format: TableExportFormatSchema.default('csv') })` for controller composition.
- `apps/api/src/common/table-search/` (new module):
  - `types.ts` — column descriptor:
    ```ts
    type ColumnSearch =
      | { kind: 'string'; field: string }                     // ILIKE %q%
      | { kind: 'enum'; field: string; values: readonly string[] }   // prefix-match → IN
      | { kind: 'number'; field: string }                     // q parses as number → =
      | { kind: 'decimal'; field: string }                    // currency-stripped, then =
      | { kind: 'datetime'; field: string; tz: string }       // q is yyyy-mm-dd → whole-day range
      | { kind: 'boolean'; field: string; truthy: string[]; falsy: string[] }
      | { kind: 'uuid'; field: string; partial?: boolean }    // full UUID → =, optional ::text ILIKE
      | { kind: 'derived'; predicates: Record<string, Prisma.Sql | object> }; // label → where clause
    ```
  - `descriptors/<resource>.ts` × 7 — one file per resource, lists the searchable columns and their `kind`s. Source of truth that ties the UI table contract above to Prisma.
  - `build-search-where.ts` — given descriptors + raw query string, returns a Prisma `{ OR: [...] }` clause. Handles: input trim, length cap (100), ILIKE escape of `%`/`_`/`\`, type coercion attempts, and the "empty contribution → fall back to string-ILIKE-only" rule.
  - `build-search-where.spec.ts` — exhaustive unit tests per `kind`: numeric, enum-prefix, date, boolean, mixed, empty, escape, overflow.
- `apps/api/src/common/table-export/` (new module):
  - `csv-streamer.ts` — takes `AsyncIterable<row>` + `columns: { key, header, format? }[]`, streams CSV to a Fastify reply. RFC 4180-safe (quote escaping, BOM for Excel UTF-8).
  - `pdf-streamer.ts` — same input, renders via `pdfmake` to a buffer, streams to reply. Landscape A4, monospace tabular numbers.
  - `row-cap.guard.ts` — counts before streaming; throws `PayloadTooLargeException` over the cap with a structured hint payload.
- `apps/api/package.json` — add `pdfmake` dep (note: needs `pdfmake/build/vfs_fonts` for fonts).

### B2 — search on list endpoints

**All 7 resources** get the multi-type search treatment, including orders + customers (which today only do single-column string ILIKE on `search`). Same input field, expanded server-side semantics.

1. **Zod schema**: add or keep `search: z.string().trim().min(1).max(100).optional()` in the list query schema in `packages/types/src/<resource>.ts`. For promotions, define `PromotionListQuery` from scratch.
2. **Controller**: bind via `ZodValidationPipe` (existing pattern).
3. **Service**: when `search` is present, AND the filter with `buildSearchWhere(<resourceDescriptor>, search)`. Existing filters (status enums, date ranges, etc.) stay untouched and stack with search.
4. **Tests**: per resource, e2e cases for each `kind`: string match, enum prefix, numeric, decimal, date, derived label, no-match-gibberish, empty fallback, length-cap clamp.
5. **Existing endpoints (orders, customers)**: the descriptor *replaces* their current single-string ILIKE. Validate that existing UI behavior still works for plain name/email searches before merging.

### B3 — export endpoint per resource

For each of the 7 in-scope resources (orders, customers, reviews, audit-log, contact, staff, promotions):

- New controller route: `@Get('export') @Permissions('<resource>:read')` — same permission as the list endpoint, **never weaker**.
- Accepts the **same Zod query schema as the list endpoint**, but with `cursor`/`limit`/`take` stripped (`.omit(...)`).
- Calls a new service method `export<Resource>(filters, format, reply)` that:
  1. Counts matching rows. If `format === 'csv' && count > 50_000` or `format === 'pdf' && count > 1_000` → 413 with hint.
  2. Streams via `findMany` in batches of 1,000 (use Prisma `cursor` to avoid loading everything into memory).
  3. Pipes through the appropriate streamer.
- Filenames: `<resource>-<restaurantSlug>-<yyyymmdd-hhmm>.<csv|pdf>` (reuse the existing `filenameFor` helper from reports.service, factored out into the shared module).

### B4 — export column mapping per resource

The export's column set **mirrors what's visible in the UI table**, in display order. Per-resource `export-columns.ts` files declare:

```ts
type ExportColumn<T> = {
  header: string;          // matches the UI column header
  pdfWidth?: number;       // optional PDF column width hint
  csv: (row: T) => string; // value for CSV cell
  pdf?: (row: T) => string;// override for PDF (defaults to csv())
  pdfOmit?: boolean;       // omit in PDF (e.g. orders "Elapsed" is redundant with "Placed")
};
```

Per resource (matches the "Export" column in each table above; "Actions" columns are omitted):

- **order**: Order # / Customer (name + email line) / Items / Type / Status / Total / Placed (Elapsed omitted in PDF)
- **customer**: Customer (name + email) / Phone / Orders / Lifetime spend / Last order / Segment
- **review**: Rating / Customer / Comment / Status / Reply (yes/no) / Posted
- **auditLog**: When / Actor (id) / Action / Resource (type + id) / IP
- **contactMessage**: Subject (+ message preview) / From (name + email) / Status / Received
- **staff**: Name (+ email) / Phone / Role / Status / Added
- **promotion**: Name (+ description) / Type / Value / Window (start–end) / Min / Status

**Formatting rules**:
- Money: `formatMoney` from `packages/utils/money.ts`.
- Dates: ISO 8601 in CSV, locale-friendly + the restaurant's timezone in PDF.
- Enum values: the same human label the UI badge shows (e.g. `DELIVERY` → "Delivery").
- Multi-line CSV cells (e.g. customer = name + email): join with `" — "` so it stays one cell.

**PDF width**: landscape A4 ≈ 11 columns max readable. Tables exceeding that drop columns marked `pdfOmit: true` first; CSV always shows the full set.

---

## Frontend plan

### F1 — shared building blocks

- `packages/ui/src/table-toolbar/index.tsx` — new primitive:
  ```tsx
  <TableToolbar
    search={{ value, onChange, placeholder }}      // optional
    filters={<OrderFilters … />}                    // arbitrary slot
    onExport={(format) => …}                        // optional
    exportDisabled={false}
    exportPending={false}
  />
  ```
  Renders: search input (with leading icon), filter slot, spacer, `Export ▾` button → dropdown menu with "Download CSV" / "Download PDF" items. No business logic.
- `apps/admin/src/lib/use-debounced-value.ts` — `useDebouncedValue<T>(value: T, ms = 300): T`. Replace the inline 250ms debouncers in orders-filters + customers-list with this. (250 → 300 to feel less twitchy on slow typists.)
- `packages/api-client/src/client.ts` — add `<resource>.export(query, format)` per in-scope resource. Reuses the existing private `downloadFile()` helper (already added for reports). The export call is just `downloadFile('/<resource>/export', { query: { ...query, format } })` — extend `downloadFile` to accept a `query` arg.

### F2 — admin hooks

For each resource, add to the existing `features/<resource>/hooks/index.ts`:

```ts
export function useExport<Resource>() {
  return useMutation<void, ApiError, { query: <ListQuery>; format: 'csv' | 'pdf' }>({
    mutationFn: async ({ query, format }) => {
      const { blob, filename } = await getApiClient().<resource>.export(query, format);
      triggerBrowserDownload(blob, filename);  // shared util
    },
    onError: (err) => notify('error', err.message),
  });
}
```

`triggerBrowserDownload` goes in `apps/admin/src/lib/download.ts` — extracted from the report-download hook we already wrote so all download flows share one anchor-click implementation.

### F3 — per-page wiring

For each in-scope page:

1. Replace the page's current toolbar markup with `<TableToolbar>` slotted into `PageHeader.rows[0]`.
2. Wire `search` state via `useDebouncedValue`, pass the *debounced* value to the list hook's query input.
3. Wire `onExport={(format) => exportMutation.mutate({ query: currentQuery, format })}` where `currentQuery` is the same filter object passed to the list hook (no debounce — user has already committed by clicking export).
4. `exportDisabled` while count is 0; `exportPending` from the mutation.

### F4 — search UX details

- Empty state when search yields 0 rows: "No <plural> match '<query>'. Clear search to see all."
- The debounced value drives the query; the immediate value drives the input — typing feels instant, network calls don't.
- URL state (search params): nice-to-have, **not** in v1 — orders + customers don't have it today either. Note as follow-up.

---

## File-by-file delta

**New files (backend):**
- `apps/api/src/common/table-search/types.ts`
- `apps/api/src/common/table-search/build-search-where.ts` + `.spec.ts`
- `apps/api/src/common/table-search/descriptors/<resource>.ts` × 7
- `apps/api/src/common/table-export/csv-streamer.ts`
- `apps/api/src/common/table-export/pdf-streamer.ts`
- `apps/api/src/common/table-export/row-cap.guard.ts`
- `apps/api/src/common/table-export/export-columns/<resource>.ts` × 7
- `apps/api/src/common/table-export/filename.ts` (extracted from reports.service)
- `apps/api/test/<resource>-search.e2e-spec.ts` × 7 (or extend existing list specs)
- `apps/api/test/<resource>-export.e2e-spec.ts` × 7

**Modified (backend):**
- `apps/api/src/{orders,customers,reviews,audit,contact,staff,promotions}/<resource>.controller.ts` — add `export` route
- `apps/api/src/{orders,customers,reviews,audit,contact,staff,promotions}/<resource>.service.ts` — add `export…` method + `search` clause in list method (for those that didn't have it)
- `apps/api/package.json` — `pdfmake` dep
- `packages/types/src/{review,audit,contact,staff,promotion}.ts` — add `search` field; define `PromotionListQuery` from scratch

**New files (frontend):**
- `packages/ui/src/table-toolbar/index.tsx`
- `packages/ui/src/index.ts` — re-export
- `apps/admin/src/lib/use-debounced-value.ts`
- `apps/admin/src/lib/download.ts`

**Modified (frontend):**
- `packages/api-client/src/client.ts` — `<resource>.export()` × 7; extend `downloadFile` with `query`
- `apps/admin/src/features/{orders,customers,reviews,audit-log,contact,staff,promotions}/hooks/index.ts` — `useExport<Resource>()` mutation
- `apps/admin/src/app/(dashboard)/{orders,customers,reviews,audit-log,contact,staff,promotions}/page.tsx` (and the corresponding feature components) — swap toolbar to `<TableToolbar>`, wire debounced search, wire export

---

## Build sequence (recommended order)

1. **Plumbing first** — `pdfmake` dep, `csv-streamer`, `pdf-streamer`, `build-search-where`, `searchable-fields`, `useDebouncedValue`, `triggerBrowserDownload`, `TableToolbar` primitive. No user-visible changes yet; all unit-tested in isolation.
2. **Orders** (already has search) — wire `<TableToolbar>` + export end-to-end as the reference implementation. Iterate UX on this one page.
3. **Customers** — same shape as orders. Validates the pattern carries.
4. **Reviews, audit-log, contact, staff** — add `search` to schemas + services + UI in one PR per resource, or one bundled PR (your call — I'd default to one bundled PR per advisor's note about cross-sprint review).
5. **Promotions** — slightly different because it has no list query schema today. Define `PromotionListQuery`, then add export + search.
6. **Cleanup** — remove the duplicated 250ms inline debouncers in orders-filters + customers-list once the shared hook lands.

Each step ends with the relevant e2e test green and a visual check against the page.

---

## Risks and follow-ups

- **PDF rendering of wide tables**: 10+ columns won't fit landscape A4. Mitigation: PDF generator picks a subset of "headline columns" per resource (subset of CSV columns); CSV stays full. Document the subset per resource alongside `columns/<resource>.ts`.
- **Memory under load**: Prisma `findMany` with cursor batches keeps memory bounded. `pdfmake` is in-memory (whole doc in RAM before pipe). At 1k rows this is fine; if we ever raise the PDF cap, switch to `pdf-lib` or chunked rendering.
- **Auth on streaming response**: same JWT/Bearer pattern as the reports download we just fixed. Frontend uses the api-client's `downloadFile()` which already handles auth headers + 401 refresh.
- **Follow-ups (not v1)**: URL state for search/filters; `pg_trgm + GIN` indexes if any table grows past ~100k rows; reservations DataTable migration; full-text search via Postgres `tsvector` if simple ILIKE becomes insufficient.

---

## Scope sanity check

- ~7 new backend routes, 2 new shared modules (table-search, table-export), 7 search descriptors + 7 export-column maps, 1 new UI primitive, 7 page rewires.
- Estimated effort: ~3–4 focused days for one developer — the per-type predicate engine and its tests are the biggest chunk; per-page wiring is mostly copy-shape after the first one.
- The plan stays inside the existing conventions in CLAUDE.md: Zod schemas in `packages/types`, money via `packages/utils/money.ts`, permission checks on every route, no client-side price/data trust.
