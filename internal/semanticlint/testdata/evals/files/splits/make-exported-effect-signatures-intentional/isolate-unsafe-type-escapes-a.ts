import * as Effect from "effect/Effect"

type Account = {
  readonly id: string
}

export const accountFromPartner = (
  payload: unknown,
): Effect.Effect<Account> => {
  const account = payload as unknown as Account
  return Effect.succeed(account)
}

export const accountLabel = (account: Account): string => account.id
