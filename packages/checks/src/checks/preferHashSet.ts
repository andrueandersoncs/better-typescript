import { Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { isInAmbientContext, typeNameIdentifier } from "./support/tsNode.js"
import {
  constructionEscapesExternally,
  typeReferenceEscapesExternally
} from "./support/tsSignature.js"
import { detection } from "@better-typescript/core/engine/location"
import type { MakeDetection } from "@better-typescript/core/engine/location"
import type { Check, CheckContext } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example"

import {
  fixtureRefactorExamples
} from "../fixtureExamples.js"
const isSetIdentifier = (identifier: ts.Identifier): boolean =>
  identifier.text === "Set"

const constructorMessage = "Avoid constructing a built-in Set."

const constructorHint =
  "Use Effect's HashSet instead — for example HashSet.fromIterable([1, 2, 3]) or " +
  "HashSet.empty(). HashSet integrates with Equal and Hash traits for structural equality. " +
  "Constructing a Set is permitted only when it is handed to a third-party API that " +
  "requires one."

const newSetMatches = (checker: ts.TypeChecker) => (match: MakeDetection) => {
  const constructionEscapes = constructionEscapesExternally(checker)

  const matches = (
    newExpression: ts.NewExpression
  ): ReadonlyArray<Detection> => {
    const expressionOption = Option.liftPredicate(ts.isIdentifier)(
      newExpression.expression
    )
    const isSetConstruction = Option.exists(expressionOption, isSetIdentifier)
    const escapesExternally =
      isSetConstruction && constructionEscapes(newExpression)
    const isReportable = [isSetConstruction, !escapesExternally].every(Boolean)

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

const setTypeNames: ReadonlyArray<string> = ["Set", "ReadonlySet"]

const isSetTypeName = (id: ts.Identifier): boolean =>
  setTypeNames.includes(id.text)

const typeRefHint =
  "Use HashSet.HashSet<T> from Effect instead. HashSet integrates with Equal and Hash " +
  "traits for structural equality. Writing the built-in Set type is permitted only where " +
  "it mirrors a third-party contract: ambient declarations and values that cross into a " +
  "third-party call."

const setTypeRefMatches =
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

type SetRuleNode = ts.NewExpression | ts.TypeReferenceNode

const isSetRuleNode = (node: ts.Node): node is SetRuleNode =>
  ts.isNewExpression(node) ||
  pipe(
    Option.liftPredicate(ts.isTypeReferenceNode)(node),
    Option.flatMap(typeNameIdentifier),
    Option.exists(isSetTypeName)
  )

const setMatches = (context: CheckContext) => {
  const match = detection(context)
  const constructionMatches = newSetMatches(context.checker)(match)
  const typeRefMatches = setTypeRefMatches(context.checker)(match)

  const matches = (node: SetRuleNode): ReadonlyArray<Detection> =>
    ts.isNewExpression(node) ? constructionMatches(node) : typeRefMatches(node)

  return matches
}

const check = nodeCheck([
  ts.SyntaxKind.NewExpression,
  ts.SyntaxKind.TypeReference
])(isSetRuleNode)(setMatches)

export const preferHashSet: Check = check

export const preferHashSetExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-hash-set")
