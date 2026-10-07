type LedgerEntry = {
  readonly reference: string
  readonly cents: number
}

const absoluteCents = (cents: number): number => {
  return Math.abs(cents)
}

const renderLedgerEntry = (entry: LedgerEntry): string => {
  const cents = absoluteCents(entry.cents)
  return `${entry.reference}:${cents}`
}

const currentEntry: LedgerEntry = { reference: "JAN-1", cents: -500 }
const renderedEntry = renderLedgerEntry(currentEntry)

void renderedEntry
