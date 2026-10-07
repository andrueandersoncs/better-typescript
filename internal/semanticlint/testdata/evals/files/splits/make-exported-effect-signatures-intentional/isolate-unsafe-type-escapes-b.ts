import * as Effect from "effect/Effect"

type Account = {
  readonly id: string
}

const accountFromPayload = (payload: unknown): Account => {
  if (typeof payload !== "object" || payload === null) throw new Error("Invalid account")
  if (!("id" in payload) || typeof payload.id !== "string") throw new Error("Invalid account")
  return { id: payload.id }
}

export const accountFromPartner = (payload: unknown): Effect.Effect<Account> => {
  const account = accountFromPayload(payload)
  return Effect.succeed(account)
}
