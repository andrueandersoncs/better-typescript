type Currency = "USD" | "EUR"

type Money = {
  readonly cents: number
  readonly currency: Currency
}

export const moneyLabel = (money: Money): string =>
  `${money.currency} ${money.cents}`

export const addMoney = (left: Money, right: Money): Money => ({
  cents: left.cents + right.cents,
  currency: left.currency,
})
