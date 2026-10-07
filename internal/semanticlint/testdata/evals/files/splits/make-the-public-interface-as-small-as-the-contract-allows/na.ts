type Price = {
  readonly cents: number
  readonly currency: "USD" | "EUR"
}

const currencySymbol = (currency: Price["currency"]): string => {
  return currency === "USD" ? "$" : "€"
}

const renderPrice = (price: Price): string => {
  const symbol = currencySymbol(price.currency)
  return `${symbol}${(price.cents / 100).toFixed(2)}`
}

const salePrice: Price = { cents: 1250, currency: "USD" }
const visiblePrice = renderPrice(salePrice)

void visiblePrice
