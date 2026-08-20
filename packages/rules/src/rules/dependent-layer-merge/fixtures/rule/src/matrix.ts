import { Effect, Layer } from "effect"
import { database, repository } from "./model.js"

export const dependencyOnly = Layer.merge(repository, database) // ~detect

export const foreverOnly = Layer.effectDiscard(Effect.forever(Effect.void))

export const backgroundOnly = Effect.forkDaemon(Effect.void)

const foreverProvider = Layer.merge(
  database,
  Layer.effectDiscard(Effect.forever(Effect.void))
)
export const dependencyAndForever = Layer.merge(repository, foreverProvider) // ~detect

export const dependencyAndMethodPipe = repository.pipe(Layer.merge(database)) // ~detect

export const castOnly = Layer.merge(repository, database as any)

const mergeAlias = Layer.merge
export const aliasOnly = mergeAlias(repository, database)
