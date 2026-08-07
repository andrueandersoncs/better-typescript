import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { symbolDeclaredInEffectPackage } from "./declarationInEffectPackage.js"
import { Array } from "effect"

export const isEffectInterfaceSymbol = (symbol: ts.Symbol) => {
  const isNamedEffect = strictEqual("Effect")(symbol.name)
  const fromEffect = symbolDeclaredInEffectPackage(symbol)
  const checks = Array.make(isNamedEffect, fromEffect)

  return Array.every(checks, Boolean)
}
