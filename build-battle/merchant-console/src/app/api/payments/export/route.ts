import { filterPayments, parseFilters, sortPayments } from "@/data/queries"
import {
  exportFilename,
  parseColumns,
  parseScope,
  toCsv,
} from "@/lib/csv"
import { NextRequest, NextResponse } from "next/server"

/**
 * Exports the payments table as CSV.
 *
 * Every param is validated before use: filters by `parseFilters`, the column
 * list by `parseColumns`, the scope by `parseScope`. Rows always come from the
 * shared query builder, unpaginated, so the file holds the whole result set
 * rather than the page on screen.
 *
 * - `scope=filter` (default): the current filters.
 * - `scope=all`: every payment, ignoring filters but keeping the sort.
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  const columns = parseColumns(params.get("columns"))
  if (!columns) {
    return NextResponse.json(
      { error: "Choose at least one valid column to export." },
      { status: 400 },
    )
  }

  const scope = parseScope(params.get("scope"))
  const parsed = parseFilters(params)
  const filters =
    scope === "all"
      ? { sort: parsed.sort, direction: parsed.direction }
      : parsed

  const rows = sortPayments(
    filterPayments(filters),
    filters.sort,
    filters.direction,
  )

  // The label comes from validated values only: the scope, or an allowlisted status.
  const label =
    scope === "all"
      ? "all"
      : parsed.status && parsed.status !== "all"
        ? parsed.status
        : "filtered"

  return new Response(toCsv(rows, columns), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${exportFilename(new Date(), label)}"`,
    },
  })
}
