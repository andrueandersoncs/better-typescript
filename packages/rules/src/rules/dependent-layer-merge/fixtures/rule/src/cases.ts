import { Layer, pipe } from "effect"
import { database, logger, repository } from "./model.js"

export const direct = Layer.merge(repository, database) // ~detect
export const reversed = Layer.merge(database, repository) // ~detect
export const mergeAll = Layer.mergeAll(logger, repository, database) // ~detect
export const dataLast = Layer.merge(database)(repository) // ~detect
export const functionPipe = pipe(repository, Layer.merge(database)) // ~detect
export const methodPipe = repository.pipe(Layer.merge(database)) // ~detect
export const arrayArgument = Layer.merge(repository, [database, logger]) // ~detect
const dependencyTuple = [repository, database] as const
export const tupleSpread = Layer.mergeAll(...dependencyTuple) // ~detect

export const hiddenDependency = Layer.provide(repository, database)
export const exposedDependency = Layer.provideMerge(repository, database)
export const independent = Layer.merge(database, logger)
export const independentAll = Layer.mergeAll(database, logger)
export const oneOperand = Layer.mergeAll(database)
