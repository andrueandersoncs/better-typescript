type Rate = {
  readonly code: string
  readonly percentage: number
}

const round = (value: number): number => Math.round(value * 100) / 100

export const calculateTax = (subtotal: number, rates: ReadonlyArray<Rate>) => {
  const portions = rates.map((rate) => ({
    code: rate.code,
    amount: round(subtotal * rate.percentage / 100)
  }))
  const total = portions.reduce((sum, portion) => sum + portion.amount, 0)

  return { portions, total }
}
