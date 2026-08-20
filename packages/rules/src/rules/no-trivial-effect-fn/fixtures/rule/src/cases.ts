import { Effect } from "effect"

declare const decode: (source: string) => Effect.Effect<string>

export const decodeSource = Effect.fn("Source.decode")(function* (source: string) { // ~detect
  return yield* decode(source)
})


declare const decodeManySources: (...sources: ReadonlyArray<string>) => Effect.Effect<string>

export const decodeMany = Effect.fn("Source.decodeMany")(function* ( // ~detect 14
  ...sources: ReadonlyArray<string>
) {
  return yield* decodeManySources(...sources)
})
