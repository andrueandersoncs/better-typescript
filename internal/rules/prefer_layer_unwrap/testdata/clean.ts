import { Effect, Layer } from "effect"
const selected = Effect.succeed(Layer.empty)
export const value = Layer.unwrap(selected)
