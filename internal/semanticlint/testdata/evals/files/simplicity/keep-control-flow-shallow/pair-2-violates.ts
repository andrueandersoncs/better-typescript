type Request = {
  readonly accountId?: string
  readonly amount: number
  readonly active: boolean
}

type Ledger = Map<string, number>

export const recordAmount = (ledger: Ledger, request: Request): Ledger => {
  if (request.accountId !== undefined) {
    if (request.active) {
      if (request.amount > 0) {
        const current = ledger.get(request.accountId) ?? 0
        if (current + request.amount < 10_000) {
          ledger.set(request.accountId, current + request.amount)
        }
      }
    }
  }
  return ledger
}
