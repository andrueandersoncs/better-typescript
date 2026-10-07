type Currency = "USD" | "EUR"

type Price = {
  readonly cents: number
  readonly currency: Currency
}

const symbolForCurrency = (currency: Currency): string => {
  return currency === "USD" ? "$" : "€"
}

const renderPrice = (price: Price): string => {
  const symbol = symbolForCurrency(price.currency)
  return `${symbol}${(price.cents / 100).toFixed(2)}`
}

const currentPrice: Price = { cents: 1200, currency: "USD" }
const visiblePrice = renderPrice(currentPrice)

void visiblePrice
