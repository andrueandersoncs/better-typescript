import { AuditClient, PaymentClient } from "@acme/payments"

export const checkout = (): string => {
  const payments = new PaymentClient()
  const audit = new AuditClient()

  return `${payments.charge()}:${audit.record()}`
}

export const makePaymentClient = (): PaymentClient => new PaymentClient()
