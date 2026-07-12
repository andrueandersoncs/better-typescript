import { Effect, Schema, pipe } from "effect"

const AccountId = pipe(Schema.String, Schema.brand("AccountId"))
type AccountId = typeof AccountId.Type

export const Account = Schema.Struct({
  id: AccountId,
  name: Schema.String
})
export type Account = typeof Account.Type

export const getById = Effect.fn("account/getById")(function* (id: AccountId) {})
