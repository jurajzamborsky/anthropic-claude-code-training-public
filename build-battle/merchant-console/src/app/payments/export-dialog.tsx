"use client"

import { Button } from "@/components/Button"
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/Drawer"
import { Download } from "lucide-react"
import { useState } from "react"

const LABELS: Record<string, string> = {
  id: "Payment ID",
  created_at: "Date (UTC)",
  merchant: "Merchant",
  description: "Description",
  status: "Status",
  method: "Method",
  card_brand: "Card brand",
  last4: "Card last four",
  amount: "Amount",
  currency: "Currency",
}

type Scope = "filter" | "all"

/**
 * Export options for the payments table (NWP-101).
 *
 * Column and scope choices are a convenience here; the export route validates
 * both again. Row counts arrive from the server, computed with the same query
 * builder the export uses, so the number shown is the number downloaded.
 */
export function ExportDialog({
  query,
  columns,
  defaultColumns,
  filteredCount,
  totalCount,
}: {
  /** The current filters as a query string, without pagination. */
  query: string
  columns: readonly string[]
  defaultColumns: readonly string[]
  filteredCount: number
  totalCount: number
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([...defaultColumns])
  const [scope, setScope] = useState<Scope>("filter")

  const reset = (next: boolean) => {
    if (next) {
      setSelected([...defaultColumns])
      setScope("filter")
    }
    setOpen(next)
  }

  const toggle = (column: string) =>
    setSelected((current) =>
      current.includes(column)
        ? current.filter((c) => c !== column)
        : [...current, column],
    )

  // Keep the table's column order, whatever order they were ticked in.
  const ordered = columns.filter((column) => selected.includes(column))
  const rowCount = scope === "all" ? totalCount : filteredCount

  const params = new URLSearchParams(query)
  params.set("scope", scope)
  params.set("columns", ordered.join(","))
  const href = `/api/payments/export?${params.toString()}`

  const canDownload = ordered.length > 0 && rowCount > 0

  return (
    <Drawer open={open} onOpenChange={reset}>
      <DrawerTrigger asChild>
        <Button variant="secondary" className="w-full gap-2 py-1.5 sm:w-fit">
          <Download
            className="-ml-0.5 size-4 shrink-0 text-gray-400 dark:text-gray-600"
            aria-hidden="true"
          />
          Export
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Export payments</DrawerTitle>
          <DrawerDescription>
            Choose what goes into the CSV file.
          </DrawerDescription>
        </DrawerHeader>

        <DrawerBody className="space-y-8">
          <fieldset>
            <legend className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Scope
            </legend>
            <div className="mt-3 space-y-2">
              {(
                [
                  ["filter", "Current filter", filteredCount],
                  ["all", "All payments", totalCount],
                ] as const
              ).map(([value, label, count]) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-3 text-sm text-gray-700 dark:text-gray-300"
                >
                  <input
                    type="radio"
                    name="export-scope"
                    value={value}
                    checked={scope === value}
                    onChange={() => setScope(value)}
                    className="size-4 accent-blue-500"
                  />
                  <span className="flex-1">{label}</span>
                  <span className="tabular-nums text-gray-500">
                    {count.toLocaleString()} rows
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Columns
            </legend>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {columns.map((column) => (
                <label
                  key={column}
                  className="flex cursor-pointer items-center gap-3 text-sm text-gray-700 dark:text-gray-300"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(column)}
                    onChange={() => toggle(column)}
                    className="size-4 accent-blue-500"
                  />
                  {LABELS[column] ?? column}
                </label>
              ))}
            </div>
            {ordered.length === 0 && (
              <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-500">
                Choose at least one column to export.
              </p>
            )}
          </fieldset>
        </DrawerBody>

        <DrawerFooter className="items-center gap-2">
          <p className="mr-auto text-sm text-gray-500" aria-live="polite">
            {rowCount.toLocaleString()} rows · {ordered.length} columns
          </p>
          {canDownload ? (
            <Button asChild variant="primary" className="w-full sm:w-fit">
              <a href={href} download onClick={() => setOpen(false)}>
                Download CSV
              </a>
            </Button>
          ) : (
            <Button variant="primary" className="w-full sm:w-fit" disabled>
              Download CSV
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
