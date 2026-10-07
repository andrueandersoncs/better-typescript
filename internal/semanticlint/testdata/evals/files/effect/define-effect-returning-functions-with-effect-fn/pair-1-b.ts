import * as Effect from "effect/Effect"

export interface Account {
  readonly id: string
  readonly status: "active"
}

export const loadAccount = Effect.fn("loadAccount")((id: string) =>
  Effect.succeed({ id, status: "active" })
)

export const defaultAccountId = "account_default"
export const accountTable = "accounts"
