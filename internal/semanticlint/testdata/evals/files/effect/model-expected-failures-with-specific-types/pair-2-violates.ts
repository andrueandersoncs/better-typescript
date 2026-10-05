import * as Effect from "effect/Effect"

type CatalogEntry = {
  readonly code: string
  readonly title: string
}

const entries = new Map<string, CatalogEntry>()

export const findEntry = (code: string) =>
  Effect.gen(function*() {
    const entry = entries.get(code)
    if (entry === undefined) {
      return yield* Effect.die(`No entry for ${code}`)
    }
    return entry
  })
