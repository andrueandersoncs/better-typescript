import { Array, flow } from "effect"
import * as ts from "typescript"
import { typeIsEffect } from "./effectSymbolOfType.js"

const callSignaturesReturnEffect = (checker: ts.TypeChecker) => (type: ts.Type) => {
  const signatures = type.getCallSignatures()
  const signatureReturnsEffect = flow(checker.getReturnTypeOfSignature.bind(checker), typeIsEffect)

  return Array.some(signatures, signatureReturnsEffect)
}

export const expressionTypeIsEffectReturning =
  (checker: ts.TypeChecker) => (expression: ts.Expression) => {
    const type = checker.getTypeAtLocation(expression)
    const callReturnsEffect = callSignaturesReturnEffect(checker)(type)
    const typeReturnsEffect = typeIsEffect(type)
    const checks = Array.make(callReturnsEffect, typeReturnsEffect)

    return Array.some(checks, Boolean)
  }
