import { Function, Option, Struct } from "effect"
import type * as ts from "typescript"

export const parameterTypeNode = Function.flow(
  Struct.get<ts.ParameterDeclaration, "type">("type"),
  Option.fromNullishOr
)
