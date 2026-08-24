import { Context, Effect, Layer } from "effect"
class Selected extends Context.Service<Selected, Layer.Layer<never>>()("Selected") {}
const selected = Effect.succeed(Layer.empty)
export const value = Layer.flatMap(Layer.effect(Selected, selected), Context.get(Selected))
