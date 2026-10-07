export type LedgerEntry = {
  readonly actorId: string
  readonly invoiceId: string
}

export interface Ledger {
  append(entry: LedgerEntry): Promise<void>
}


const currentRequestContext = { actorId: "" }

export const storeAuthenticatedActor = (actorId: string): void => {
  currentRequestContext.actorId = actorId
}

export const recordInvoiceViewed = (
  invoiceId: string,
  ledger: Ledger
): Promise<void> => {
  const entry = { actorId: currentRequestContext.actorId, invoiceId }

  return ledger.append(entry)
}
