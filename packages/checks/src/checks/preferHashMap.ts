import { Array, Function, pipe, Option, Struct } from "effect"
import * as ts from "typescript"
import { isInAmbientContext, type NewOrTypeReferenceNode } from "./support/tsNode.js"
import {
  constructionEscapesExternally,
  typeReferenceEscapesExternally
} from "./support/tsSignature.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
import { nodeCheck, detection } from "@better-typescript/core/engine/check"

const isMapIdentifier = (identifier: ts.Identifier): boolean => identifier.text === "Map"

const constructorMessage = "Avoid constructing a built-in Map."

const constructorHint =
  'Use Effect\'s HashMap instead — for example HashMap.fromIterable([["a", 1]]) or ' +
  "HashMap.empty(). HashMap uses Equal and Hash with structural equality by default; " +
  "for reference-identity object keys (for example TypeScript checker symbols), wrap " +
  "keys with Equal.byReferenceUnsafe at the creation boundary. Constructing a Map is " +
  "permitted only when it is handed to a third-party API that requires one."

const mapTypeNames: ReadonlyArray<string> = Array.make("Map", "ReadonlyMap")

const isMapTypeName = (id: ts.Identifier): boolean => Array.contains(mapTypeNames, id.text)

const typeRefHint =
  "Use HashMap.HashMap<K, V> from Effect instead. HashMap uses Equal and Hash with " +
  "structural equality by default; wrap reference-identity object keys with " +
  "Equal.byReferenceUnsafe at the creation boundary. Writing the built-in Map type is " +
  "permitted only where it mirrors a third-party contract: ambient declarations and " +
  "values that cross into a third-party call."

const isMapRuleNode = (node: ts.Node): node is NewOrTypeReferenceNode =>
  ts.isNewExpression(node) ||
  pipe(
    Option.liftPredicate(ts.isTypeReferenceNode)(node),
    Option.flatMap((ref) => Option.liftPredicate(ts.isIdentifier)(ref.typeName)),
    Option.exists(isMapTypeName)
  )

const mapMatches = (context: CheckContext) => {
  const match = detection(context)
  const constructionEscapes = constructionEscapesExternally(context.checker)
  const typeRefEscapes = typeReferenceEscapesExternally(context.checker)

  const matches = (node: ts.Node): ReadonlyArray<Detection> => {
    if (!isMapRuleNode(node)) {
      return Array.empty()
    }

    if (ts.isNewExpression(node)) {
      const expressionOption = Option.liftPredicate(ts.isIdentifier)(node.expression)
      const isMapConstruction = Option.exists(expressionOption, isMapIdentifier)
      const escapesExternally = isMapConstruction && constructionEscapes(node)
      const reportableConditions = Array.make(isMapConstruction, !escapesExternally)
      const isReportable = Array.every(reportableConditions, Boolean)

      const constructorMatch = match({
        node,
        message: constructorMessage,
        hint: constructorHint
      })

      return isReportable ? Array.of(constructorMatch) : Array.empty()
    }

    const isAmbient = isInAmbientContext(node)
    const escapesExternally = typeRefEscapes(node)
    const isBoundaryMirror = isAmbient || escapesExternally

    if (isBoundaryMirror) {
      return Array.empty()
    }

    const name = pipe(
      Option.liftPredicate(ts.isIdentifier)(node.typeName),
      Option.map(Struct.get("text")),
      Option.getOrElse(Function.constant(""))
    )

    const message = `Avoid the built-in ${name} type.`

    const typeRefMatch = match({
      node,
      message,
      hint: typeRefHint
    })

    return Array.of(typeRefMatch)
  }

  return matches
}

const mapRuleNodeKinds = Array.make(ts.SyntaxKind.NewExpression, ts.SyntaxKind.TypeReference)

const check = nodeCheck(mapRuleNodeKinds)(isMapRuleNode)(mapMatches)

export const preferHashMap: Check = check

export const preferHashMapExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-hash-map")
