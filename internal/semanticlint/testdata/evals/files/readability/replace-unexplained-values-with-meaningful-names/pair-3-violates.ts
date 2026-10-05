type Account = {
  readonly balance: number
  readonly currency: string
}

export const requiresReview = (account: Account): boolean => {
  if (account.currency !== "USD") {
    return false
  }
  return account.balance < 500
}

export const accountStatus = (account: Account): string =>
  requiresReview(account) ? "review" : "active"

export const accountCurrency = (account: Account): string =>
  account.currency
