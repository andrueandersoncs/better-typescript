import { Array, Option, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import { isEffectInterfaceSymbol } from "../support/tsSignature.js"
import { unwrapTransparentExpression } from "../support/tsNode.js"
import { inspectEffectFnCall, type EffectFnNameInspection } from "./reportedSchemaEffectFnShared.js"

const effectSymbolOfType = flow((type: ts.Type) => type.getSymbol(), Option.fromNullishOr)

const effectAliasSymbolOfType = flow(
  Struct.get<ts.Type, "aliasSymbol">("aliasSymbol"),
  Option.fromNullishOr
)

const typeIsEffect = (type: ts.Type) => {
  const direct = pipe(effectSymbolOfType(type), Option.exists(isEffectInterfaceSymbol))
  const alias = pipe(effectAliasSymbolOfType(type), Option.exists(isEffectInterfaceSymbol))
  const checks = Array.make(direct, alias)

  return Array.some(checks, Boolean)
}

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

export const functionLikeReturnsEffect =
  (checker: ts.TypeChecker) => (declaration: ts.SignatureDeclaration) =>
    pipe(
      declaration,
      flow(checker.getSignatureFromDeclaration.bind(checker), Option.fromNullishOr),
      Option.map(checker.getReturnTypeOfSignature.bind(checker)),
      Option.exists(typeIsEffect)
    )

const inspectionHasName = (inspection: EffectFnNameInspection) => Option.isSome(inspection.name)

const expressionIsNamedEffectFn = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
  pipe(inspectEffectFnCall(checker)(expression), Option.exists(inspectionHasName))

export const initializerIsNamedEffectFn =
  (checker: ts.TypeChecker) => (expression: ts.Expression) =>
    pipe(expression, unwrapTransparentExpression, expressionIsNamedEffectFn(checker))
