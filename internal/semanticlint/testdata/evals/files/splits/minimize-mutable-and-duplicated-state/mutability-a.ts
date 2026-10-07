type Payment = {
  readonly amountCents: number
}

export const paymentTotal = (payments: readonly Payment[]): number => {
  let total = 0
  for (const payment of payments) {
    total += payment.amountCents
  }
  return total
}

export const paymentCount = (payments: readonly Payment[]): number =>
  payments.length
