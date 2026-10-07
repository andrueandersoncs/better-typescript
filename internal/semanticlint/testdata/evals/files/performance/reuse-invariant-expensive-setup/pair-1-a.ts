type LedgerEntry = {
  readonly occurredAt: Date
  readonly amount: number
}

type LedgerRow = {
  readonly date: string
  readonly amount: number
}

export const formatLedger = (entries: readonly LedgerEntry[]): readonly LedgerRow[] =>
  entries.map((entry) => ({
    date: new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(entry.occurredAt),
    amount: entry.amount,
  }))
