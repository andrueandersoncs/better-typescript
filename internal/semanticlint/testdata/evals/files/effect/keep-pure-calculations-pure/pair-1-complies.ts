type InvoiceInput = {
  readonly number: string
  readonly cents: number
  readonly currency: "USD"
  readonly note?: string
}

class Invoice {
  constructor(readonly number: string, readonly cents: number) {}
}

export const invoiceFromInput = (input: InvoiceInput): Invoice => {
  const number = input.number.trim().toUpperCase()
  return new Invoice(number, input.cents)
}
