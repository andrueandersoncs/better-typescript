import { effectVitestModules } from "../../internal/builtins/effectQuality/effectVitestModules.js"
import { callExpressionKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Function, Option, Result, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../../internal/equivalence.js"
import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"
import { makeRule } from "../../internal/rule/makeRule.js"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import { callExpressionOf } from "../../internal/support/callExpressionOf.js"
import { symbolDeclaredInEffectPackage } from "../../internal/support/declarationInEffectPackage.js"
import type { ImportedMember } from "../../internal/support/effectApi/importedMember.js"
import { importedMemberAt } from "../../internal/support/effectApi/importedMemberAt.js"
import { isEffectInterfaceSymbol } from "../../internal/support/isEffectInterfaceSymbol.js"
import { isFunctionInitializer } from "../../internal/support/isFunctionInitializer.js"
import { unwrapTransparentExpression } from "../../internal/support/transparentWrapper.js"
import {
  makeSubjectMatch,
  noSubjectMatches
} from "../../internal/builtins/effectQuality/subjectMatch.js"

const effectReturnTypeOfSignature = (checker: ts.TypeChecker) => (signature: ts.Signature) =>
  checker.getReturnTypeOfSignature(signature)

const identifierTextIsIt = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("it"))

const identifierIsIt = (expression: ts.Expression) =>
  pipe(Option.liftPredicate(ts.isIdentifier)(expression), Option.exists(identifierTextIsIt))

const plainItMethods = Array.make("only", "skip", "todo", "concurrent", "sequential")

const moduleIsEffectVitest = (moduleSpecifier: string) =>
  Array.some(effectVitestModules, (candidate) => {
    const exact = strictEqual(candidate)(moduleSpecifier)
    const nested = moduleSpecifier.startsWith(`${candidate}/`)
    const flags = Array.make(exact, nested)

    return Array.some(flags, Boolean)
  })

const memberIsEffectVitestIt = (member: ImportedMember) => {
  const vitestModule = moduleIsEffectVitest(member.moduleSpecifier)
  const singlePath = strictEqual(1)(member.path.length)
  const pathHead = Array.get(member.path, 0)
  const namedIt = pipe(pathHead, Option.contains("it"))
  const flags = Array.make(vitestModule, singlePath, namedIt)

  return Array.every(flags, Boolean)
}

const expressionIsEffectVitestIt = (checker: ts.TypeChecker) => (expression: ts.Expression) => {
  const unwrapped = unwrapTransparentExpression(expression)
  const member = importedMemberAt(checker)(unwrapped)

  return Option.exists(member, memberIsEffectVitestIt)
}

const bareItCall =
  (isVitestIt: (expression: ts.Expression) => boolean) => (callee: ts.Expression) =>
    pipe(
      Option.liftPredicate(ts.isIdentifier)(callee),
      Option.filter(identifierTextIsIt),
      Option.exists(isVitestIt)
    )

const propertyItCall =
  (isVitestIt: (expression: ts.Expression) => boolean) => (callee: ts.Expression) =>
    pipe(
      Option.liftPredicate(ts.isPropertyAccessExpression)(callee),
      Option.exists((access) => {
        const root = unwrapTransparentExpression(access.expression)
        const isPlainMethod = Array.contains(plainItMethods, access.name.text)
        const rootNamedIt = identifierIsIt(root)
        const vitestIt = isVitestIt(root)
        const flags = Array.make(rootNamedIt, isPlainMethod, vitestIt)

        return Array.every(flags, Boolean)
      })
    )

const callExpressionPropertyAccess = (call: ts.CallExpression) =>
  Option.liftPredicate(ts.isPropertyAccessExpression)(call.expression)

const eachItCall =
  (isVitestIt: (expression: ts.Expression) => boolean) => (callee: ts.Expression) =>
    pipe(
      Option.liftPredicate(ts.isCallExpression)(callee),
      Option.flatMap(callExpressionPropertyAccess),
      Option.exists((access) => {
        const root = unwrapTransparentExpression(access.expression)
        const rootNamedIt = identifierIsIt(root)
        const isEach = strictEqual("each")(access.name.text)
        const vitestIt = isVitestIt(root)
        const flags = Array.make(rootNamedIt, isEach, vitestIt)

        return Array.every(flags, Boolean)
      })
    )

const callIsPlainIt = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const callee = unwrapTransparentExpression(call.expression)
  const isVitestIt = expressionIsEffectVitestIt(checker)
  const bare = bareItCall(isVitestIt)(callee)
  const property = propertyItCall(isVitestIt)(callee)
  const each = eachItCall(isVitestIt)(callee)
  const flags = Array.make(bare, property, each)

  return Array.some(flags, Boolean)
}

const effectTypeSymbolOption = flow(
  (type: ts.Type) => type.getSymbol() ?? type.aliasSymbol,
  Option.fromNullishOr
)

const symbolIsNamedEffectFromPackage = (candidate: ts.Symbol) => {
  const namedEffect = strictEqual("Effect")(candidate.name)
  const fromPackage = symbolDeclaredInEffectPackage(candidate)
  const flags = Array.make(namedEffect, fromPackage)

  return Array.every(flags, Boolean)
}

const symbolLooksLikeEffectAlias = (candidate: ts.Symbol) => {
  const namedEffect = strictEqual("Effect")(candidate.name)
  const namedDefault = strictEqual("default")(candidate.name)
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

const signatureReturnsEffect =
  (checker: ts.TypeChecker) => (typeIsEffectCheck: (type: ts.Type) => boolean) =>
    flow(effectReturnTypeOfSignature(checker), typeIsEffectCheck)

const typeIsEffect = (checker: ts.TypeChecker) => (type: ts.Type) => {
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

const callbackStaticallyReturnsEffect =
  (checker: ts.TypeChecker) => (callback: ts.ArrowFunction | ts.FunctionExpression) => {
    const signature = signatureFromCallback(checker)(callback)
    const returnsEffect = flow(effectReturnTypeOfSignature(checker), typeIsEffect(checker))

    return Option.exists(signature, returnsEffect)
  }

const callArguments = Struct.get<ts.CallExpression, "arguments">("arguments")

const functionInitializerOf = (argument: ts.Expression) => {
  const current = unwrapTransparentExpression(argument)

  return isFunctionInitializer(current) ? Result.succeed(current) : Result.failVoid
}

const filterFunctionInitializers = (args: ReadonlyArray<ts.Expression>) =>
  Array.filterMap(args, functionInitializerOf)

const testCallbackArgument = flow(callArguments, filterFunctionInitializers, Array.last)

const findingsForPlainEffectIt = flow(makeSubjectMatch("it"), Array.of)

const effectTestStyleFindings = (context: MatchContext) => (node: ts.Node) => {
  const isPlainIt = callIsPlainIt(context.checker)
  const returnsEffect = callbackStaticallyReturnsEffect(context.checker)

  const findingsWhenCallbackReturnsEffect = (call: ts.CallExpression) =>
    pipe(
      testCallbackArgument(call),
      Option.filter(returnsEffect),
      Option.map(() => findingsForPlainEffectIt(call))
    )

  return pipe(
    callExpressionOf(node),
    Option.filter(isPlainIt),
    Option.flatMap(findingsWhenCallbackReturnsEffect),
    Option.getOrElse(Function.constant(noSubjectMatches))
  )
}

const effectTestStyleScanner = makeNodeScanner(callExpressionKinds)(ts.isCallExpression)(
  effectTestStyleFindings
)

export const effectTestStyle = makeRule("effect-test-style")(effectTestStyleScanner)(
  fixedRuleMessage(
    "Use it.effect for Effect tests.",
    "Effect-aware tests provide the correct runtime and deterministic services."
  )
)
