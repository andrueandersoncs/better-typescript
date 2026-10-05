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
  Effect.try((): SearchQuery => {
    const parsed = JSON.parse(input.phrase) as { readonly phrase: string }
    return { phrase: parsed.phrase, limit: Math.max(1, input.limit) }
  })
