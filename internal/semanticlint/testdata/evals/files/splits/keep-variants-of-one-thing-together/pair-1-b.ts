type PaymentEvent = "created" | "cancelled"

type Payment = {
  readonly id: string
}

export const paymentCreated = (payment: Payment): PaymentEvent =>
  "created"

export const paymentCancelled = (payment: Payment): PaymentEvent =>
  "cancelled"

export const receiptLabel = (payment: Payment): string =>
  `Receipt ${payment.id}`
