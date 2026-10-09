import { Effect } from "effect"
import { InvoiceRepo, type Invoice } from "./InvoiceRepo"

export interface LineItem {
  readonly description: string
  readonly unitCents: number
  readonly quantity: number
}

export const totalCents = (items: ReadonlyArray<LineItem>): number =>
  Math.round(items.reduce((sum, i) => sum + i.unitCents * i.quantity, 0))

export const finalizeInvoice = (id: string) =>
  Effect.gen(function* () {
    const repo = yield* InvoiceRepo
    const invoice: Invoice = yield* repo.get(id)
    const total = totalCents(invoice.items)
    yield* repo.save({ ...invoice, totalCents: total, status: "final" })
    return total
  })
