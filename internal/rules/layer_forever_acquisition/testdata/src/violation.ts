import { Effect, Layer } from "effect"
export const worker = Layer.effectDiscard(Effect.forever(Effect.void))
