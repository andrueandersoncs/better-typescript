import type { Account } from "./account.js"

export const credit = (amount: number, account: Account): Account => ({
  ...account,
  balance: account.balance + amount
})
