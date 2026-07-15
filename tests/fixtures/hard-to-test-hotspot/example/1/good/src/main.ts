import { PaymentClient } from "./paymentClient.js"

const payments = new PaymentClient()

export const result = payments.charge(10)
