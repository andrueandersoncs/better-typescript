import { callableDefinitions } from "./callableDefinitions.js"
import type { FunctionDefinition } from "./functionDefinition.js"
import { pipe, Array, Option, Function } from "effect"

export const terminalDefinition = (scan: FunctionDefinition) =>
  pipe(callableDefinitions(scan), Array.last, Option.getOrElse(Function.constant(scan)))
