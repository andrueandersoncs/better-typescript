import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { EffectQualityRuleFinding } from "./findings.js"
import type { EffectQualityIndex } from "./index.js"
import { makeRuleFinding } from "./makeFindings.js"
import { typeSymbolName } from "./reportedRuntimeSupport.js"

const handrolledTtlCacheFinding = makeRuleFinding("handrolled-ttl-cache")

const inflightDedupeMapFinding = makeRuleFinding("inflight-dedupe-map")

const emptyTypes = Array.empty<ts.Type>()

const identifierTextIsMap = (identifier: ts.Identifier) => identifier.text === "Map"

const isMapIdentifier = (expression: ts.Expression) =>
  pipe(Option.liftPredicate(ts.isIdentifier)(expression), Option.exists(identifierTextIsMap))

const newExpressionIsMap = (expression: ts.NewExpression) => isMapIdentifier(expression.expression)

const newMapExpression = (node: ts.Node) =>
  pipe(Option.liftPredicate(ts.isNewExpression)(node), Option.filter(newExpressionIsMap))

const sourceLooksLikeHandrolledTtlCache = (sourceText: string) => {
  const hasExpires = /\bexpires(?:At|On|In)?\b/u.test(sourceText)
  const hasDateNow = sourceText.includes("Date.now")
  const hasDelete = sourceText.includes(".delete(")
  const hasExpiryAndClock = hasExpires && hasDateNow

  return hasExpiryAndClock && hasDelete
}

export const handrolledTtlCacheFindings = (
  context: CheckContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    newMapExpression(node),
    Option.filter(() => sourceLooksLikeHandrolledTtlCache(context.sourceFile.text)),
    Option.map(handrolledTtlCacheFinding("Map")),
    Option.toArray
  )

const typeArgsOfTypeReference = (checker: ts.TypeChecker) => (type: ts.Type) => {
  const reference = type as ts.TypeReference
  const objectFlags = reference.objectFlags ?? 0
  const isReference = (objectFlags & ts.ObjectFlags.Reference) !== 0

  return isReference ? checker.getTypeArguments(reference) : emptyTypes
}

const typeMentionsConstructor =
  (checker: ts.TypeChecker) =>
  (name: string) =>
  (type: ts.Type): boolean => {
    const visit = (current: ts.Type, seen: ReadonlyArray<ts.Type>): boolean => {
      const alreadySeen = Array.some(seen, (previous) => previous === current)
      const notSeen = alreadySeen === false
      const nextSeen = Array.append(seen, current)
      const symbolName = typeSymbolName(current)
      const matchesName = symbolName === name
      const unionParts = current.isUnionOrIntersection() ? current.types : emptyTypes
      const visitNext = (candidate: ts.Type) => visit(candidate, nextSeen)
      const unionMentions = Array.some(unionParts, visitNext)
      const typeArguments = typeArgsOfTypeReference(checker)(current)
      const argumentMentions = Array.some(typeArguments, visitNext)
      const rendered = checker.typeToString(current)
      const renderedMentions = rendered.includes(`${name}<`)
      const nestedFlags = Array.make(unionMentions, argumentMentions, renderedMentions)
      const hasStructural = Array.some(nestedFlags, Boolean)
      const matchFlags = Array.make(matchesName, hasStructural)
      const matches = Array.some(matchFlags, Boolean)
      const resultFlags = Array.make(notSeen, matches)

      return Array.every(resultFlags, Boolean)
    }

    return visit(type, emptyTypes)
  }

const mapValueLooksPending = (context: CheckContext) => (expression: ts.NewExpression) => {
  const type = context.checker.getTypeAtLocation(expression)
  const mentions = typeMentionsConstructor(context.checker)
  const asPromise = mentions("Promise")(type)
  const asEffect = mentions("Effect")(type)

  return asPromise || asEffect
}

const variableMapValueLooksPending =
  (context: CheckContext) => (declaration: ts.VariableDeclaration) => {
    const mentions = typeMentionsConstructor(context.checker)

    const annotated = pipe(
      Option.fromNullishOr(declaration.type),
      Option.map((typeNode) => context.checker.getTypeFromTypeNode(typeNode)),
      Option.exists((type) => {
        const asPromise = mentions("Promise")(type)
        const asEffect = mentions("Effect")(type)

        return asPromise || asEffect
      })
    )

    const fromInitializer = pipe(
      Option.fromNullishOr(declaration.initializer),
      Option.filter(ts.isNewExpression),
      Option.exists(mapValueLooksPending(context))
    )

    return annotated || fromInitializer
  }

const initializerIsNewMap = (declaration: ts.VariableDeclaration) =>
  pipe(
    Option.fromNullishOr(declaration.initializer),
    Option.flatMap(newMapExpression),
    Option.isSome
  )

export const inflightDedupeMapFindings = (
  context: CheckContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const fromNew = pipe(
    newMapExpression(node),
    Option.filter(mapValueLooksPending(context)),
    Option.map(inflightDedupeMapFinding("Map"))
  )

  const fromVariable = pipe(
    Option.liftPredicate(ts.isVariableDeclaration)(node),
    Option.filter(initializerIsNewMap),
    Option.filter(variableMapValueLooksPending(context)),
    Option.map(inflightDedupeMapFinding("Map"))
  )

  const candidates = Array.make(fromNew, fromVariable)

  return Array.flatMap(candidates, Option.toArray)
}
