import * as Effect from "effect/Effect"

type Invoice = {
  readonly id: string
  readonly amount: number
}

type Ledger = {
  readonly fetchInvoice: (id: string) => Promise<Invoice>
}

export const loadInvoice = (ledger: Ledger, id: string) => {
  const pending = () => ledger.fetchInvoice(id)
  return Effect.tryPromise(pending)
}
