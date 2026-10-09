import { Effect } from "effect"
import { InvoiceRepo, type Invoice } from "./InvoiceRepo"

export interface LineItem {
  readonly description: string
  readonly unitCents: number
  readonly quantity: number
}

export interface TotalOptions {
  readonly rounding?: (cents: number) => number
  readonly beforeTotal?: (items: ReadonlyArray<LineItem>) => ReadonlyArray<LineItem>
  readonly extra?: Record<string, unknown>
}

export const totalCents = (items: ReadonlyArray<LineItem>, options: TotalOptions = {}): number => {
  const prepared = options.beforeTotal ? options.beforeTotal(items) : items
  const raw = prepared.reduce((sum, i) => sum + i.unitCents * i.quantity, 0)
  return options.rounding ? options.rounding(raw) : Math.round(raw)
}

export const finalizeInvoice = (id: string) =>
  Effect.gen(function* () {
    const repo = yield* InvoiceRepo
    const invoice: Invoice = yield* repo.get(id)
    const total = totalCents(invoice.items)
    yield* repo.save({ ...invoice, totalCents: total, status: "final" })
    return total
  })
