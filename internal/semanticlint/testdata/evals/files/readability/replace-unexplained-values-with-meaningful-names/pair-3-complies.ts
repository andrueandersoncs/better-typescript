type Account = {
  readonly balance: number
  readonly currency: string
}

const minimumUsdBalance = 500

export const requiresReview = (account: Account): boolean => {
  if (account.currency !== "USD") {
    return false
  }
  return account.balance < minimumUsdBalance
}

export const accountStatus = (account: Account): string =>
  requiresReview(account) ? "review" : "active"

export const accountCurrency = (account: Account): string =>
  account.currency
