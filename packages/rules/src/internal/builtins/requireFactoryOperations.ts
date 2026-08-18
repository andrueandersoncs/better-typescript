import { HashSet, Option, pipe } from "effect"
import type { CallableSemantics } from "../support/callableSemanticsClass.js"

export const factoryOperations = HashSet.make("build", "construct", "create", "make")

export const isFactoryOperation = (operation: string) => HashSet.has(factoryOperations, operation)

export const factoryOperation = (semantics: CallableSemantics) =>
  pipe(semantics.name.operation, Option.filter(isFactoryOperation))
