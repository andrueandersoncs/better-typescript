import * as Effect from "effect/Effect"

type Account = {
  readonly id: string
  readonly email: string
}

const decodeAccount = (body: unknown): Account => {
  const value = body as { readonly id: string; readonly email: string }
  return { id: value.id, email: value.email }
}

export const loadAccount = (id: string) =>
  Effect.tryPromise(() =>
    fetch(`/accounts/${id}`)
      .then((response) => response.json())
      .then(decodeAccount)
  )
