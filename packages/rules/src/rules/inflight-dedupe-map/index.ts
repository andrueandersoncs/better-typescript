import { effectQualityRuntimeKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Option, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "../../internal/equivalence.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { acceptsNode } from "../../internal/scanner/acceptsNode.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { typeSymbolName } from "../../internal/builtins/effectQuality/effectApiFacts.js"

import { makeSubjectMatch } from "../../internal/builtins/effectQuality/subjectMatch.js"

import { newMapExpression } from "../../internal/builtins/effectQuality/cacheRulesShared.js"

const emptyTypes = Array.empty<ts.Type>()

const typeArgsOfTypeReference = (checker: ts.TypeChecker) => (type: ts.Type) => {
  const objectFlags = (type as ts.TypeReference).objectFlags ?? 0
  const isReference = (objectFlags & ts.ObjectFlags.Reference) !== 0

  return isReference ? checker.getTypeArguments(type as ts.TypeReference) : emptyTypes
}

const typeMentionsConstructor =
  (checker: ts.TypeChecker) =>
  (name: string) =>
  (type: ts.Type): boolean => {
    const visit =
      (seen: ReadonlyArray<ts.Type>) =>
      (current: ts.Type): boolean => {
        const previousEqualsCurrent = strictEqual(current)
        const alreadySeen = Array.some(seen, previousEqualsCurrent)
        const notSeen = strictEqual(false)(alreadySeen)
        const nextSeen = Array.append(seen, current)
        const symbolName = typeSymbolName(current)
        const matchesName = strictEqual(name)(symbolName)
        const unionParts = current.isUnionOrIntersection() ? current.types : emptyTypes
        const visitNext = visit(nextSeen)
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

    return visit(emptyTypes)(type)
  }

const mapValueLooksPending = (context: MatchContext) => (expression: ts.NewExpression) => {
  const type = context.checker.getTypeAtLocation(expression)
  const mentions = typeMentionsConstructor(context.checker)
  const asPromise = mentions("Promise")(type)
  const asEffect = mentions("Effect")(type)

  return asPromise || asEffect
}

const variableMapValueLooksPending =
  (context: MatchContext) => (declaration: ts.VariableDeclaration) => {
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

const inflightDedupeMapFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    const fromNew = pipe(
      newMapExpression(node),
      Option.filter(mapValueLooksPending(context)),
      Option.map(makeSubjectMatch("Map"))
    )

    const fromVariable = pipe(
      Option.liftPredicate(ts.isVariableDeclaration)(node),
      Option.filter(initializerIsNewMap),
      Option.filter(variableMapValueLooksPending(context)),
      Option.map(makeSubjectMatch("Map"))
    )

    const candidates = Array.make(fromNew, fromVariable)

    return Array.flatMap(candidates, Option.toArray)
  }

const inflightDedupeMapScanner =
  makeNodeScanner(effectQualityRuntimeKinds)(acceptsNode)(inflightDedupeMapFindings)

export const inflightDedupeMap = makeRule("inflight-dedupe-map")(inflightDedupeMapScanner)(
  fixedRuleMessage(
    "Avoid a hand-rolled in-flight deduplication Map when Effect Cache fits.",
    "Cache.get shares an in-flight lookup for the same missing key."
  )
)
