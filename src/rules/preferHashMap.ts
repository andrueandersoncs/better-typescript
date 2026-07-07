import { Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "./ruleCheck.js"
import { isInAmbientContext, typeNameIdentifier } from "./tsNode.js"
import {
  constructionEscapesExternally,
  typeReferenceEscapesExternally
} from "./tsSignature.js"
import { detection } from "../detectors/location.js"
import type { MakeDetection } from "../detectors/location.js"
import type { RuleCheck, RuleContext, Detection } from "../detectors/rule.js"

// --- new Map(...) detection ---

const isMapIdentifier = (identifier: ts.Identifier): boolean =>
  identifier.text === "Map"

const constructorMessage = "Avoid constructing a built-in Map."

const constructorHint =
  'Use Effect\'s HashMap instead — for example HashMap.fromIterable([["a", 1]]) or ' +
  "HashMap.empty(). HashMap integrates with Equal and Hash traits for structural equality. " +
  "Constructing a Map is permitted only when it is handed to a third-party API that " +
  "requires one."

const newMapMatches = (checker: ts.TypeChecker) => (match: MakeDetection) => {
  const constructionEscapes = constructionEscapesExternally(checker)

  const matches = (
    newExpression: ts.NewExpression
  ): ReadonlyArray<Detection> => {
    const expressionOption = Option.liftPredicate(ts.isIdentifier)(
      newExpression.expression
    )
    const isMapConstruction = Option.exists(expressionOption, isMapIdentifier)
    const escapesExternally =
      isMapConstruction && constructionEscapes(newExpression)
    const isReportable = [isMapConstruction, !escapesExternally].every(Boolean)

    return isReportable
      ? [
          match({
            node: newExpression,
            message: constructorMessage,
            hint: constructorHint
          })
        ]
      : []
  }

  return matches
}

// --- Map<K, V> / ReadonlyMap<K, V> type reference detection ---

const mapTypeNames: ReadonlyArray<string> = ["Map", "ReadonlyMap"]

const isMapTypeName = (id: ts.Identifier): boolean =>
  mapTypeNames.includes(id.text)

const typeRefHint =
  "Use HashMap.HashMap<K, V> from Effect instead. HashMap integrates with Equal and Hash " +
  "traits for structural equality. Writing the built-in Map type is permitted only where " +
  "it mirrors a third-party contract: ambient declarations and values that cross into a " +
  "third-party call."

const mapTypeRefMatches =
  (checker: ts.TypeChecker) => (match: MakeDetection) => {
    const typeRefEscapes = typeReferenceEscapesExternally(checker)

    const matches = (
      typeRef: ts.TypeReferenceNode
    ): ReadonlyArray<Detection> => {
      const isAmbient = isInAmbientContext(typeRef)
      const escapesExternally = typeRefEscapes(typeRef)
      const isBoundaryMirror = isAmbient || escapesExternally

      if (isBoundaryMirror) {
        return []
      }

      const name = (typeRef.typeName as ts.Identifier).text
      const message = `Avoid the built-in ${name} type.`

      return [
        match({
          node: typeRef,
          message,
          hint: typeRefHint
        })
      ]
    }

    return matches
  }

// --- subscription ---

type MapRuleNode = ts.NewExpression | ts.TypeReferenceNode

const isMapRuleNode = (node: ts.Node): node is MapRuleNode =>
  ts.isNewExpression(node) ||
  pipe(
    Option.liftPredicate(ts.isTypeReferenceNode)(node),
    Option.flatMap(typeNameIdentifier),
    Option.exists(isMapTypeName)
  )

// The context stage runs once per file, so both specialized handlers are shared by every node the report wiring feeds to matches.
const mapMatches = (context: RuleContext) => {
  const match = detection(context)
  const constructionMatches = newMapMatches(context.checker)(match)
  const typeRefMatches = mapTypeRefMatches(context.checker)(match)

  const matches = (node: MapRuleNode): ReadonlyArray<Detection> =>
    ts.isNewExpression(node) ? constructionMatches(node) : typeRefMatches(node)

  return matches
}

const check = nodeCheck([
  ts.SyntaxKind.NewExpression,
  ts.SyntaxKind.TypeReference
])(isMapRuleNode)(mapMatches)

// --- examples ---

export const preferHashMap: RuleCheck = check
