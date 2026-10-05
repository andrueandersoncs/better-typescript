import * as Effect from "effect/Effect"

type SearchInput = {
  readonly phrase: string
  readonly limit: number
}

type SearchQuery = {
  readonly phrase: string
  readonly limit: number
}

export const toSearchQuery = (input: SearchInput) =>
  Effect.try(() => ({
    phrase: input.phrase.trim().toLowerCase(),
    limit: Math.max(1, input.limit)
  }))
