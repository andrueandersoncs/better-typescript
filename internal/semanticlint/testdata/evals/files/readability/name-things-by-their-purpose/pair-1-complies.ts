type Invoice = {
  readonly amount: number
  readonly settled: boolean
}

export const calculateOutstandingBalance = (invoices: ReadonlyArray<Invoice>): number => {
  let total = 0
  for (let i = 0; i < invoices.length; i++) {
    const invoice = invoices[i]!
    if (!invoice.settled) {
      total += invoice.amount
    }
  }
  return total
}
