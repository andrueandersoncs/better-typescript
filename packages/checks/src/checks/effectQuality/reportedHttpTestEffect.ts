import { Array, Option, flow } from "effect"
import * as ts from "typescript"
import { isEffectInterfaceSymbol, symbolDeclaredInEffectPackage } from "../support/tsSignature.js"

const effectTypeSymbolOption = flow(
  (type: ts.Type) => type.getSymbol() ?? type.aliasSymbol,
  Option.fromNullishOr
)

const symbolIsNamedEffectFromPackage = (candidate: ts.Symbol) => {
  const namedEffect = candidate.name === "Effect"
  const fromPackage = symbolDeclaredInEffectPackage(candidate)
  const flags = Array.make(namedEffect, fromPackage)

  return Array.every(flags, Boolean)
}

const symbolLooksLikeEffectAlias = (candidate: ts.Symbol) => {
  const namedEffect = candidate.name === "Effect"
  const namedDefault = candidate.name === "default"
  const nameOkFlags = Array.make(namedEffect, namedDefault)
  const nameOk = Array.some(nameOkFlags, Boolean)
  const fromEffect = symbolDeclaredInEffectPackage(candidate)
  const flags = Array.make(nameOk, fromEffect)

  return Array.some(flags, Boolean)
}

const renderedLooksLikeEffect = (rendered: string) => {
  const includesEffect = rendered.includes("Effect<")
  const startsWithEffectDot = rendered.startsWith("Effect.")
  const flags = Array.make(includesEffect, startsWithEffectDot)

  return Array.some(flags, Boolean)
}

// Confirm via symbol when possible because rendered text is only a fallback for aliases.
const renderedEffectConfirmed =
  (checker: ts.TypeChecker) => (type: ts.Type) => (symbol: Option.Option<ts.Symbol>) => {
    const rendered = checker.typeToString(type)
    const looksLikeEffect = renderedLooksLikeEffect(rendered)
    const symbolOk = Option.exists(symbol, symbolLooksLikeEffectAlias)
    const startsWithEffect = rendered.startsWith("Effect<")
    const confirmedFlags = Array.make(symbolOk, startsWithEffect)
    const confirmed = Array.some(confirmedFlags, Boolean)
    const flags = Array.make(looksLikeEffect, confirmed)

    return Array.every(flags, Boolean)
  }

const effectReturnTypeOfSignature = (checker: ts.TypeChecker) => (signature: ts.Signature) =>
  checker.getReturnTypeOfSignature(signature)

const signatureReturnsEffect =
  (checker: ts.TypeChecker) => (typeIsEffectCheck: (type: ts.Type) => boolean) =>
    flow(effectReturnTypeOfSignature(checker), typeIsEffectCheck)

export const typeIsEffect = (checker: ts.TypeChecker) => (type: ts.Type) => {
  const symbol = effectTypeSymbolOption(type)
  const interfaceEffect = Option.exists(symbol, isEffectInterfaceSymbol)
  const namedEffectFromPackage = Option.exists(symbol, symbolIsNamedEffectFromPackage)
  const renderedConfirmed = renderedEffectConfirmed(checker)(type)(symbol)
  const signatures = type.getCallSignatures()
  const isEffectType = typeIsEffect(checker)
  const returnsEffect = signatureReturnsEffect(checker)(isEffectType)
  const signatureReturns = Array.some(signatures, returnsEffect)

  const flags = Array.make(
    interfaceEffect,
    namedEffectFromPackage,
    renderedConfirmed,
    signatureReturns
  )

  return Array.some(flags, Boolean)
}

const signatureFromCallback = (checker: ts.TypeChecker) =>
  flow(checker.getSignatureFromDeclaration.bind(checker), Option.fromNullishOr)

export const callbackStaticallyReturnsEffect =
  (checker: ts.TypeChecker) => (callback: ts.ArrowFunction | ts.FunctionExpression) => {
    const signature = signatureFromCallback(checker)(callback)
    const returnsEffect = flow(effectReturnTypeOfSignature(checker), typeIsEffect(checker))

    return Option.exists(signature, returnsEffect)
  }
