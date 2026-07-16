export class LivePayment {
  charge(amount: number): string {
    return `live:${amount}`
  }
}

export const submitPayment = (amount: number, payments: LivePayment): string =>
  payments.charge(amount)
