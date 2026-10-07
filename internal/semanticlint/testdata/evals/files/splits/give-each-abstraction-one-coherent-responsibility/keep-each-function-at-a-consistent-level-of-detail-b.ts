export type Payment = {
  readonly reference: string
  readonly cents: number
}

export type Invoice = {
  readonly paymentReference: string
  readonly totalCents: number
}

const parsePaymentResponse = (response: string): Payment => {
  const fields = response.trim().split(",")
  const reference = fields[0].trim()
  const cents = Number(fields[1])
  return { reference, cents }
}

export const createInvoice = (response: string): Invoice => {
  const payment = parsePaymentResponse(response)
  return { paymentReference: payment.reference, totalCents: payment.cents }
}
