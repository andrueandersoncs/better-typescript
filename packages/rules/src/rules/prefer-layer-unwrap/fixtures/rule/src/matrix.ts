import { Context, Effect, Layer } from "effect"
import { Selected, SelectedComposite, Worker, database, repository, selected } from "./model.js"

export const candidateOnly = Layer.flatMap(Layer.effect(Selected, selected), Context.get(Selected)) // ~detect

export const lifetimeOnly = Layer.effect(Worker, Effect.forever(Effect.void))

export const candidateAndLifetime = Layer.flatMap( // ~detect
  Layer.effect(Selected, Effect.as(Effect.forever(Effect.void), database)),
  Context.get(Selected)
)

export const dependencyOnly = Layer.merge(repository, database)

export const candidateAndDependency = Layer.flatMap( // ~detect
  Layer.effect(SelectedComposite, Effect.succeed(Layer.merge(repository, database))),
  Context.get(SelectedComposite)
)

const flatten = Layer.flatMap
export const aliasOnly = flatten(Layer.effect(Selected, selected), Context.get(Selected))
