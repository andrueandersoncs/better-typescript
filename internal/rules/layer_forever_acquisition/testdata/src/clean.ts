import { Effect, Layer } from "effect"
export const worker = Layer.effectDiscard(Effect.forkScoped(Effect.forever(Effect.void)))
