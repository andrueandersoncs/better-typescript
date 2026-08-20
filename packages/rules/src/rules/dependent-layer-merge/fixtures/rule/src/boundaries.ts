import { Layer } from "effect"
import { database, logger, repository } from "./model.js"

export const sharedInputLeft: Layer.Layer<never, never, Database> = Layer.empty
export const sharedInputRight: Layer.Layer<never, never, Database> = Layer.empty
export const sharedInput = Layer.merge(sharedInputLeft, sharedInputRight)

export const uncertain: any = database
export const uncertainMerge = Layer.merge(repository, uncertain)

const localMerge = Layer.merge
export const localAliasCall = localMerge(repository, database)

export const independentPair = Layer.merge(database, logger)
