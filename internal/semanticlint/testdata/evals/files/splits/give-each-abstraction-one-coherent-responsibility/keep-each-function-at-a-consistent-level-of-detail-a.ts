export type Payment = {
  readonly reference: string
  readonly cents: number
}

export type Invoice = {
  readonly paymentReference: string
  readonly totalCents: number
}

export const createInvoice = (response: string): Invoice => {
  const fields = response.trim().split(",")
  const reference = fields[0].trim()
  const cents = Number(fields[1])
  const payment: Payment = { reference, cents }
  return { paymentReference: payment.reference, totalCents: payment.cents }
}
