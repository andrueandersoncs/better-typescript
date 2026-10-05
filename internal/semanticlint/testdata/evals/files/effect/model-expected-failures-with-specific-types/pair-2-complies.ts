import * as Effect from "effect/Effect"

class CatalogEntryAbsent {
  readonly _tag = "CatalogEntryAbsent"
  constructor(readonly code: string) {}
}

type CatalogEntry = {
  readonly code: string
  readonly title: string
}

const entries = new Map<string, CatalogEntry>()

export const findEntry = (code: string) =>
  Effect.gen(function*() {
    const entry = entries.get(code)
    if (entry === undefined) {
      return yield* Effect.fail(new CatalogEntryAbsent(code))
    }
    return entry
  })
