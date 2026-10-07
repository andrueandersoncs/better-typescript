import * as Effect from "effect/Effect"

export interface Account {
  readonly id: string
  readonly status: "active"
}

export function loadAccount(id: string): Effect.Effect<Account> {
  return Effect.succeed({ id, status: "active" })
}

export const defaultAccountId = "account_default"
export const accountTable = "accounts"
