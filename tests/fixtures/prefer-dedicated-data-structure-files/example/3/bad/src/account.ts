export interface Account {
  readonly id: string
  readonly balance: number
}

export const credit = (amount: number, account: Account): Account => ({
  ...account,
  balance: account.balance + amount
})
