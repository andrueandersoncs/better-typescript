import { HashSet } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "./ruleCheck.js"
import { transparentWrapperKinds } from "./tsNode.js"
import { isExternalPackageArgument } from "./tsSignature.js"
import { detection } from "../detectors/location.js"
import type { RuleCheck, RuleContext, Detection } from "../detectors/rule.js"

const sanctionedParentKinds = HashSet.make(
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.ArrowFunction
)

const effectiveParent = (node: ts.Node): ts.Node =>
  HashSet.has(transparentWrapperKinds, node.parent.kind)
    ? effectiveParent(node.parent)
    : node.parent

// The context stage runs once per file, so every partial below is shared by all ArrowFunctions the report wiring feeds to matches.
const arrowFunctionMatches = (context: RuleContext) => {
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

export const noInlineClosures: RuleCheck = check
