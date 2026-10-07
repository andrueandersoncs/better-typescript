type Currency = "USD" | "EUR" | "GBP"

type Money = {
  amount: number
  currency: Currency
}

const symbols: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
}

export function formatMoney(money: Money): string {
  return `${symbols[money.currency]}${money.amount.toFixed(2)}`
}

export function addMoney(left: Money, right: Money): Money {
  if (left.currency !== right.currency) {
    throw new Error("Currencies must match")
  }

  return { currency: left.currency, amount: left.amount + right.amount }
}
