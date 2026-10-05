type Price = {
  readonly amount: number
  readonly currency: string
}

const symbols: Readonly<Record<string, string>> = {
  EUR: "€",
  GBP: "£",
  USD: "$"
}

export const formatPrice = (price: Price): string => {
  const symbol = symbols[price.currency] ?? `${price.currency} `
  const amount = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(price.amount)

  return `${symbol}${amount}`
}
