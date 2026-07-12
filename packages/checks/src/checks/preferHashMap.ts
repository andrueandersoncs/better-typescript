import { Array, Function, pipe, Option, Struct } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { isInAmbientContext, typeNameIdentifier } from "./support/tsNode.js"
import {
  constructionEscapesExternally,
  typeReferenceEscapesExternally
} from "./support/tsSignature.js"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"

const isMapIdentifier = (identifier: ts.Identifier): boolean =>
  identifier.text === "Map"

const constructorMessage = "Avoid constructing a built-in Map."

const constructorHint =
  'Use Effect\'s HashMap instead — for example HashMap.fromIterable([["a", 1]]) or ' +
  "HashMap.empty(). HashMap integrates with Equal and Hash traits for structural equality. " +
  "Constructing a Map is permitted only when it is handed to a third-party API that " +
  "requires one."

const mapTypeNames: ReadonlyArray<string> = ["Map", "ReadonlyMap"]

const isMapTypeName = (id: ts.Identifier): boolean =>
  Array.contains(mapTypeNames, id.text)

const typeRefHint =
  "Use HashMap.HashMap<K, V> from Effect instead. HashMap integrates with Equal and Hash " +
  "traits for structural equality. Writing the built-in Map type is permitted only where " +
  "it mirrors a third-party contract: ambient declarations and values that cross into a " +
  "third-party call."

type MapRuleNode = ts.NewExpression | ts.TypeReferenceNode

const isMapRuleNode = (node: ts.Node): node is MapRuleNode =>
  ts.isNewExpression(node) ||
  pipe(
    Option.liftPredicate(ts.isTypeReferenceNode)(node),
    Option.flatMap(typeNameIdentifier),
    Option.exists(isMapTypeName)
  )

const mapMatches = (context: CheckContext) => {
  const match = detection(context)
  const constructionEscapes = constructionEscapesExternally(context.checker)
  const typeRefEscapes = typeReferenceEscapesExternally(context.checker)

  const matches = (node: MapRuleNode): ReadonlyArray<Detection> => {
    if (ts.isNewExpression(node)) {
      const expressionOption = Option.liftPredicate(ts.isIdentifier)(
        node.expression
      )

      const isMapConstruction = Option.exists(expressionOption, isMapIdentifier)

      const escapesExternally = isMapConstruction && constructionEscapes(node)

      const isReportable = Array.every(
        [isMapConstruction, !escapesExternally],
        Boolean
      )

      return isReportable
        ? [
            match({
              node,
              message: constructorMessage,
              hint: constructorHint
            })
          ]
        : []
    }

    const isAmbient = isInAmbientContext(node)
    const escapesExternally = typeRefEscapes(node)
    const isBoundaryMirror = isAmbient || escapesExternally

    if (isBoundaryMirror) {
      return []
    }

    const name = pipe(
      typeNameIdentifier(node),
      Option.map(Struct.get("text")),
      Option.getOrElse(Function.constant(""))
    )

    const message = `Avoid the built-in ${name} type.`

    return [
      match({
        node,
        message,
        hint: typeRefHint
      })
    ]
  }

  return matches
}

const check = nodeCheck([
  ts.SyntaxKind.NewExpression,
  ts.SyntaxKind.TypeReference
])(isMapRuleNode)(mapMatches)

export const preferHashMap: Check = check

export const preferHashMapExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-hash-map")
