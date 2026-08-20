import { Context, Effect, Layer, pipe } from "effect"
import { Database, Selected, database, selected } from "./model.js"

export const direct = Layer.flatMap(Layer.effect(Selected, selected), Context.get(Selected)) // ~detect

export const curried = Layer.flatMap<Selected, Database, never, never>(Context.get(Selected))( // ~detect
  Layer.effect(Selected)(selected)
)

export const methodPipe = Layer.effect(Selected, selected).pipe(
  Layer.flatMap(Context.get(Selected)) // ~detect
)

export const functionPipe = pipe(
  Layer.effect(Selected, selected),
  Layer.flatMap(Context.get(Selected)) // ~detect
)

export const compliant = Layer.unwrap(selected)

export const effectOnly = selected

export const ordinaryEffect = Layer.effect(
  Database,
  Effect.succeed(Database.of({ query: Effect.succeed("value") }))
)

export const layerSource = Layer.flatMap(
  Layer.succeed(Selected, database),
  Context.get(Selected)
)

export const doesNotExtract = Layer.flatMap(
  Layer.effect(Selected, selected),
  () => database
)
