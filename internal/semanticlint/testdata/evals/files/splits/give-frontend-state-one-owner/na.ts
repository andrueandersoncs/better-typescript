export type CurrencyAmount = {
  readonly cents: number
  readonly currency: "USD" | "EUR"
}

const currencySymbols = {
  USD: "$",
  EUR: "€"
} as const

const decimalAmount = (cents: number): string => {
  const amount = cents / 100

  return amount.toFixed(2)
}

export const formatCurrencyAmount = (amount: CurrencyAmount): string => {
  const symbol = currencySymbols[amount.currency]
  const decimal = decimalAmount(amount.cents)

  return `${symbol}${decimal}`
}
