import { Function, Struct } from "effect"
import type * as ts from "typescript"
import { symbolsForBindingName } from "./symbolsForBindingName.js"

export const variableSymbols = (checker: ts.TypeChecker) =>
  Function.flow(Struct.get<ts.VariableDeclaration, "name">("name"), symbolsForBindingName(checker))
