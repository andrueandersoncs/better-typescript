import { Layer } from "effect"
import { database, repository } from "./model.js"

const databaseLayer = () => database

export const namedOperands = Layer.merge(repository, database) // ~detect

export const nestedOperand = Layer.merge(repository, databaseLayer()) // ~detect

export const methodPipe = repository.pipe(Layer.merge(database)) // ~detect
