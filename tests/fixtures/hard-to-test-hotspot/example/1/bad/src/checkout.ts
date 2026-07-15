import { PaymentClient } from "./paymentClient.js"

export const checkout = (amount: number): string => {
  const primary = new PaymentClient()
  const fallback = new PaymentClient()

  return `${primary.charge(amount)}:${fallback.charge(amount)}`
}
