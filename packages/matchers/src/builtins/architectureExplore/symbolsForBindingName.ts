import { Array, Function, Option } from "effect"
import type * as ts from "typescript"
import { bindingIdentifiers } from "./bindingIdentifiers.js"
import { symbolForIdentifier } from "./symbolOwnsIdentifier.js"

export const symbolsForBindingName =
  (checker: ts.TypeChecker) =>
  (name: ts.BindingName): ReadonlyArray<ts.Symbol> => {
    const identifiers = bindingIdentifiers(name)
    const symbolsForIdentifier = Function.flow(symbolForIdentifier(checker), Option.toArray)

    return Array.flatMap(identifiers, symbolsForIdentifier)
  }
