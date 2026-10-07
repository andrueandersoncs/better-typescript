import * as Effect from "effect/Effect"

type TokenSource = {
  readonly readAccessToken: () => string
}

declare const tokenSource: TokenSource

export const loadAccessToken = (): Effect.Effect<string> =>
  Effect.sync(() => tokenSource.readAccessToken())

export const authorizationHeader = (token: string): string =>
  `Bearer ${token}`

export const tokenIsPresent = (token: string): boolean => token.length > 0
