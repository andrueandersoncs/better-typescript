import { Effect } from "effect"

declare const decode: (source: string) => Effect.Effect<string>

export const decodeSource = Effect.fn("Source.decode")(function* (source: string) { // ~detect
  return yield* decode(source)
})
