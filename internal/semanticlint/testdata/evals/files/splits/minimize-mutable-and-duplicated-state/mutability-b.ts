type Payment = {
  readonly amountCents: number
}

export const paymentTotal = (payments: readonly Payment[]): number =>
  payments.reduce((total, payment) => total + payment.amountCents, 0)

export const paymentCount = (payments: readonly Payment[]): number =>
  payments.length

export const paymentAmounts = (payments: readonly Payment[]): readonly number[] =>
  payments.map((payment) => payment.amountCents)
