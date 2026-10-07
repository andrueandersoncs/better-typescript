type LedgerEntry = {
  readonly occurredAt: Date
  readonly amount: number
}

type LedgerRow = {
  readonly date: string
  readonly amount: number
}

const ledgerDateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" })

export const formatLedger = (entries: readonly LedgerEntry[]): readonly LedgerRow[] =>
  entries.map((entry) => ({
    date: ledgerDateFormat.format(entry.occurredAt),
    amount: entry.amount,
  }))
