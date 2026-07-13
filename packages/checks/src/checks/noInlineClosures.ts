import { Array, HashSet } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { transparentWrapperKinds } from "./support/tsNode.js"
import { isExternalPackageArgument } from "./support/tsSignature.js"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"

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

    const reported = match({
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

    return isSanctioned ? Array.empty() : Array.of(reported)
  }

  return matches
}

const arrowFunctionKinds = Array.of(ts.SyntaxKind.ArrowFunction)
const check = nodeCheck(arrowFunctionKinds)(ts.isArrowFunction)(arrowFunctionMatches)

export const noInlineClosures: Check = check

export const noInlineClosuresExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-inline-closures")
