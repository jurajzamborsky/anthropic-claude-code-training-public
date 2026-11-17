# SPEC · NWP-101 — Payments export: let ops choose columns and scope

> Written before any code. Generated with `/spec`, then edited by a human.
> Load it as context when you build: `@docs/specs/NWP-101-export-options.md`

**Ticket:** [NWP-101](../tickets/NWP-101.md)
**Author:** jurajzamborsky (with Claude Code)
**Status:** reviewed

## Problem

Ops exports the payments table several times a day, but every file carries every column, including the card last four. Anything going to a merchant is cleaned by hand first: 3–4 hours a month, and a near-miss last quarter when an unedited file almost went to the wrong merchant.

## Current state

Paths are relative to `build-battle/merchant-console/`.

- `src/app/payments/page.tsx:69` — Export is a plain `<a href="/api/payments/export?{current query}">`. No dialog, no options.
- `src/app/payments/page.tsx:36-44` — the page builds its own `PaymentFilters` instead of calling `parseFilters`, and drops `from`, `to`, `sort` and `direction`. The table and the export can disagree on those params.
- `src/app/api/payments/export/route.ts` — validates with `parseFilters`, then `filterPayments` + `sortPayments`, no pagination. The export already covers the whole filter, not the visible page.
- `src/data/queries.ts` — `parseFilters` (the allowlist), `filterPayments`, `sortPayments`, `queryPayments`. The one query builder, also behind `GET /api/payments`.
- `src/lib/csv.ts` — `EXPORT_COLUMNS` (10 columns, including `last4`), `toCsv(payments, columns)` already accepts a column list, `exportFilename(date)` returns `payments-YYYY-MM-DD.csv` in UTC with no scope.
- `src/lib/money.ts` — `formatMoney` is the one formatter. `toCsv` already uses it and writes `currency` as its own column.
- `src/components/Drawer.tsx` — Radix dialog wrapper with title, description, body, footer, close. The repo has no `Dialog.tsx` and no checkbox component.
- The ticket's note about SQL does not apply literally: there is no database. The same rule applies to the in-memory store and to the filename.

## Domain rules

| Rule | Source | What breaks if ignored |
| --- | --- | --- |
| "Money is integer minor units… Format once, at the edge, next to its currency code." | `merchant-console/CLAUDE.md` | Amounts drift or arrive with no currency |
| "One query builder. Payment filtering goes through the builder behind `GET /api/payments`." | `merchant-console/CLAUDE.md` | Export and table disagree on which rows exist |
| "Anything from the client — column names, currencies, limits, statuses — is checked against an allowlist before it reaches a query, a filename, or the store." | `merchant-console/CLAUDE.md` | Arbitrary input reaches the serializer or the filename |
| "Card last-four is **off** by default." | NWP-101 | The near-miss repeats |
| "Deselecting every column disables Download rather than producing an empty file." | NWP-101 | An empty file reaches a merchant |

## Approach

The server stays the authority. The export route gains two validated params: `columns` (comma-separated, checked against `EXPORT_COLUMNS`, order preserved, missing means the default set without `last4`, empty or unknown means 400) and `scope` (`filter` default, or `all`). Both scopes go through `filterPayments`; `all` simply passes empty filters. A client dialog on `/payments`, built on `Drawer`, collects the choices and links to the route. Row counts for both scopes are computed in the server component with the same query builder and passed as props, so the count shown is the count exported.

**Considered and rejected:** building the CSV in the browser from the table rows. The table is paginated at 20, so this exports one page, which is the bug the ticket warns about. Also rejected: fetching `GET /api/payments` from the dialog for the count. It works, but the page already has the numbers on the server, and a second request adds a loading state for nothing.

## File map

| File | Add or change | Why |
| --- | --- | --- |
| `src/lib/csv.ts` | change | `DEFAULT_EXPORT_COLUMNS`, `parseColumns`, scope-aware `exportFilename` |
| `src/app/api/payments/export/route.ts` | change | Validate `columns` and `scope`, 400 on invalid |
| `src/lib/csv.test.ts` | change | Column selection, default without last4, empty and unknown selection, filename |
| `src/app/payments/export-dialog.tsx` | add | Client dialog: columns, scope, row count, Download |
| `src/app/payments/page.tsx` | change | Use `parseFilters`, compute both counts, render the dialog |

## Plan

1. **Column and filename helpers in `csv.ts`** — done when: `npm test` passes with the new cases.
2. **Route validation** — done when: `curl` returns a CSV without `last4` by default, 400 for `columns=` and `columns=password`, and the `scope=all` row count exceeds the filtered one.
3. **Page uses `parseFilters`** — done when: the table still renders and filters as before.
4. **Export dialog** — done when: in the browser, the dialog opens from Export, shows both counts, Download is disabled with no columns, and the downloaded file matches the selection.
5. **Checks** — `npm test`, `npx tsc --noEmit`, `npm run lint`.

## Verification

| Acceptance criterion | How it is proven |
| --- | --- |
| Choose columns, last four off by default | `parseColumns` tests; `curl` default export has no `last4` header |
| Scope current filter / all, filter default, row count visible | `curl` row counts per scope; dialog shows both counts |
| Filename reflects scope and date | `exportFilename` tests; `Content-Disposition` header from `curl` |
| Amounts in minor units, formatted once, currency in its own column | Existing `$250.00` serializer test; `currency` column in output |
| No columns disables Download | Disabled button in the dialog; server returns 400 as the backstop |

## Risks

- Filename slug for a filter with no status is not specified by the ticket. Using `filtered`, with the status name when one is set (`payments-disputed-…`). The slug comes from the validated status only, never from raw input.
- Column choices reset each time the dialog opens. Acceptable for this ticket.

## Out of scope

- Sorting by amount compares strings (`src/data/queries.ts:81`). Real bug, not this ticket; noted for the PR.
- Remembering column choices between sessions.
- Other export formats.

## Open questions

- Should `all` also ignore the current sort? Assuming it keeps the default sort (newest first).
