import * as Effect from "effect/Effect"

type TokenSource = {
  readonly readAccessToken: () => string
}

class TokenSourceFailure {
  readonly _tag = "TokenSourceFailure"
  constructor(readonly cause: unknown) {}
}

declare const tokenSource: TokenSource

export const loadAccessToken = (): Effect.Effect<string, TokenSourceFailure> =>
  Effect.try({
    try: () => tokenSource.readAccessToken(),
    catch: (cause) => new TokenSourceFailure(cause),
  })

export const authorizationHeader = (token: string): string =>
  `Bearer ${token}`

export const tokenIsPresent = (token: string): boolean => token.length > 0
