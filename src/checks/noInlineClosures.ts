import { HashSet } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import { transparentWrapperKinds } from "./support/tsNode.js"
import { isExternalPackageArgument } from "./support/tsSignature.js"
import { detection } from "../engine/location.js"
import type { Check, CheckContext } from "../engine/check.js"
import type { Detection } from "../engine/location.js"
import {
  fixtureRefactorExamples
} from "../engine/example.js"
import type { NonEmptyRefactorExamples } from "../engine/example.js"

const sanctionedParentKinds = HashSet.make(
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.ArrowFunction
)

const effectiveParent = (node: ts.Node): ts.Node =>
  HashSet.has(transparentWrapperKinds, node.parent.kind)
    ? effectiveParent(node.parent)
    : node.parent

const arrowFunctionMatches = (context: CheckContext) => {
  const isExternalArgument = isExternalPackageArgument(context.checker)(
    context.program
  )
  const match = detection(context)

  const matches = (
    arrowFunction: ts.ArrowFunction
  ): ReadonlyArray<Detection> => {
    const parent = effectiveParent(arrowFunction)
    const hasSanctionedParent = HashSet.has(sanctionedParentKinds, parent.kind)
    const isExternalCallback = isExternalArgument(arrowFunction)
    const isSanctioned = hasSanctionedParent || isExternalCallback

    return isSanctioned
      ? []
      : [
          match({
            node: arrowFunction.equalsGreaterThanToken,
            message:
              "Avoid arrow functions outside naming, currying, and third-party callback positions.",
            hint:
              "Name this function as a top-level const and pass it by reference, currying it when it " +
              "needs values from the enclosing scope. Inline arrows are permitted only as arguments " +
              "to third-party functions (effect combinators, node_modules callbacks). When the " +
              "expression sequences several steps, prefer a generator (Option.gen or Effect.gen) " +
              "over nesting functions."
          })
        ]
  }

  return matches
}

const check = nodeCheck([ts.SyntaxKind.ArrowFunction])(ts.isArrowFunction)(
  arrowFunctionMatches
)

export const noInlineClosures: Check = check

export const noInlineClosuresExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-inline-closures")
