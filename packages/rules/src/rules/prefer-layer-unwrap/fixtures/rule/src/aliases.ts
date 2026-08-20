import { Context as C, Effect as Fx, Layer as L, pipe as apply } from "effect"
import { Selected, selected } from "./model.js"

export const namespaceAliases = L.flatMap(L.effect(Selected, selected), C.get(Selected)) // ~detect

export const elementAccess = L["flatMap"]( // ~detect
  L["effect"](Selected, selected),
  C["get"](Selected)
)

export const functionAlias = apply(
  L.effect(Selected, selected),
  L.flatMap(C.get(Selected))
)

export const typedEffect: Fx.Effect<L.Layer<never>> = Fx.succeed(L.empty)

const Layer = {
  effect: <A>(key: unknown, value: A) => ({ key, value }),
  flatMap: <A, B>(self: A, map: (value: A) => B) => map(self)
}
const Context = { get: (_key: unknown) => (value: unknown) => value }
const fakeEffect = { value: L.empty }

export const lookalike = Layer.flatMap(
  Layer.effect("Selected", fakeEffect),
  Context.get("Selected")
)
