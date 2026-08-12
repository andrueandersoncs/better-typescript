import { Effect } from "effect"

declare const decode: (source: string) => Effect.Effect<string>

export const normalizeSource = Effect.fn("Source.normalize")(function* (source: string) {
  return yield* decode(source).pipe(Effect.map((value) => value.trim()))
})
