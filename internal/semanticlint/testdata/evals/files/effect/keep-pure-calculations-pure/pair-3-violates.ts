import * as Array from "effect/Array"
import * as Effect from "effect/Effect"

const normalized = (text: string) => text.toLowerCase().trim()

const terms = (text: string) =>
  Array.filter(normalized(text).split(/\s+/), (term) => term.length > 2)

const matches = (needles: ReadonlyArray<string>, haystack: ReadonlyArray<string>) =>
  Array.reduce(needles, 0, (total, needle) => total + (haystack.includes(needle) ? 1 : 0))

export const scoreHeading = Effect.fn(function*(query: string, heading: string) {
  const queryTerms = terms(query)
  const headingTerms = terms(heading)
  return matches(queryTerms, headingTerms) / Math.max(1, queryTerms.length)
})
