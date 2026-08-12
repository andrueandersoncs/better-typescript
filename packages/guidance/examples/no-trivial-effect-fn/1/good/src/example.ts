import { Effect } from "effect"

declare const decode: (source: string) => Effect.Effect<string>

export const decodeSource = decode
