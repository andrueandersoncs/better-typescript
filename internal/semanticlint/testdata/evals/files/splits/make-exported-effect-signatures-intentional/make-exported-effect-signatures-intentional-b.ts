import * as Effect from "effect/Effect"

type Account = {
  readonly id: string
}

const accountForId = (id: string): Account => ({ id })

export const findAccount = (id: string): Effect.Effect<Account> => {
  const account = accountForId(id)
  return Effect.succeed(account)
}

export const accountLabel = (account: Account): string => account.id
