import { callableDefinitions } from "./callableDefinitions.js"
import type { FunctionDefinition } from "./functionDefinition.js"
import { pipe, Array, Option, Function } from "effect"

export const terminalDefinition = (definition: FunctionDefinition) =>
  pipe(callableDefinitions(definition), Array.last, Option.getOrElse(Function.constant(definition)))
