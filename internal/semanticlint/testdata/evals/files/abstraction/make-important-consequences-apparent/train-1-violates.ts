import type { Database } from "./db"

export interface LineItem {
  readonly sku: string
  readonly unitCents: number
  readonly quantity: number
}

export interface Quote {
  readonly customerId: string
  readonly items: ReadonlyArray<LineItem>
  readonly discountPercent: number
}

const subtotal = (items: ReadonlyArray<LineItem>): number =>
  items.reduce((sum, item) => sum + item.unitCents * item.quantity, 0)

const applyDiscount = (cents: number, percent: number): number =>
  Math.round(cents * (1 - percent / 100))

export const formatQuoteTotal = (cents: number): string =>
  `$${(cents / 100).toFixed(2)}`

export async function computeQuoteTotal(db: Database, quote: Quote): Promise<number> {
  const total = applyDiscount(subtotal(quote.items), quote.discountPercent)
  await db.query(
    "update customers set last_quote_cents = $1, quoted_at = now() where id = $2",
    [total, quote.customerId],
  )
  return total
}

export async function quoteSummary(db: Database, quote: Quote): Promise<string> {
  const total = await computeQuoteTotal(db, quote)
  return `${quote.items.length} items, ${formatQuoteTotal(total)}`
}
