import { HashSet, Option, pipe } from "effect"
import type { CallableSemantics } from "../support/callableSemanticsClass.js"

const commandOperations = HashSet.make("publish", "save", "send", "write")

export const isCommandOperation = (operation: string) => HashSet.has(commandOperations, operation)

export const commandOperation = (semantics: CallableSemantics) =>
  pipe(semantics.name.operation, Option.filter(isCommandOperation))
