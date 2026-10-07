import * as Effect from "effect/Effect"

export interface EmailAddress {
  readonly value: string
}

export function parseEmail(input: string): Effect.Effect<EmailAddress, Error> {
  if (!input.includes("@")) {
    return Effect.fail(new Error("An email address needs an at sign"))
  }

  return Effect.succeed({ value: input.trim().toLowerCase() })
}

export const fallbackEmailDomain = "example.com"
