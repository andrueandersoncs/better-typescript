interface CalculateInvoiceInput {
  readonly subtotal: number
  readonly discount: number
}

const calculateInvoice = (input: CalculateInvoiceInput): number => input.subtotal - input.discount

void calculateInvoice
