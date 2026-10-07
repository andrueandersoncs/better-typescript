export type LedgerEntry = {
  readonly actorId: string
  readonly invoiceId: string
}

export interface Ledger {
  append(entry: LedgerEntry): Promise<void>
}


export const recordInvoiceViewed = (
  actorId: string,
  invoiceId: string,
  ledger: Ledger
): Promise<void> => {
  const entry = { actorId, invoiceId }

  return ledger.append(entry)
}
