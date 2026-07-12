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

const isSetIdentifier = (identifier: ts.Identifier): boolean =>
  identifier.text === "Set"

const constructorMessage = "Avoid constructing a built-in Set."

const constructorHint =
  "Use Effect's HashSet instead — for example HashSet.fromIterable([1, 2, 3]) or " +
  "HashSet.empty(). HashSet integrates with Equal and Hash traits for structural equality. " +
  "Constructing a Set is permitted only when it is handed to a third-party API that " +
  "requires one."

const setTypeNames: ReadonlyArray<string> = Array.make("Set", "ReadonlySet")

const isSetTypeName = (id: ts.Identifier): boolean =>
  Array.contains(setTypeNames, id.text)

const typeRefHint =
  "Use HashSet.HashSet<T> from Effect instead. HashSet integrates with Equal and Hash " +
  "traits for structural equality. Writing the built-in Set type is permitted only where " +
  "it mirrors a third-party contract: ambient declarations and values that cross into a " +
  "third-party call."

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
  const constructionEscapes = constructionEscapesExternally(context.checker)
  const typeRefEscapes = typeReferenceEscapesExternally(context.checker)

  const matches = (node: SetRuleNode): ReadonlyArray<Detection> => {
    if (ts.isNewExpression(node)) {
      const expressionOption = Option.liftPredicate(ts.isIdentifier)(
        node.expression
      )

      const isSetConstruction = Option.exists(expressionOption, isSetIdentifier)

      const escapesExternally = isSetConstruction && constructionEscapes(node)

      const values203 = Array.make(isSetConstruction, !escapesExternally)
      const isReportable = Array.every(values203, Boolean)

      const value204 = match({
        node,
        message: constructorMessage,
        hint: constructorHint
      })

      return isReportable ? Array.of(value204) : Array.empty()
    }

    const isAmbient = isInAmbientContext(node)
    const escapesExternally = typeRefEscapes(node)
    const isBoundaryMirror = isAmbient || escapesExternally

    if (isBoundaryMirror) {
      return Array.empty()
    }

    const name = pipe(
      typeNameIdentifier(node),
      Option.map(Struct.get("text")),
      Option.getOrElse(Function.constant(""))
    )

    const message = `Avoid the built-in ${name} type.`

    const value205 = match({
      node,
      message,
      hint: typeRefHint
    })

    return Array.of(value205)
  }

  return matches
}

const values206 = Array.make(
  ts.SyntaxKind.NewExpression,
  ts.SyntaxKind.TypeReference
)

const check = nodeCheck(values206)(isSetRuleNode)(setMatches)

export const preferHashSet: Check = check

export const preferHashSetExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-hash-set")
