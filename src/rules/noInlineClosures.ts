import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { transparentWrapperKinds } from "./tsNode.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-inline-closures"

// The two positions where an arrow function may appear: named as a variable
// initializer, or returned as the entire body of another arrow function (currying).
// An expression whose parent is an ArrowFunction can only be its body — parameter
// defaults sit under Parameter nodes — so a parent-kind check is sufficient.
const sanctionedParentKinds = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.ArrowFunction
])

const effectiveParent = (node: ts.Node): ts.Node =>
  transparentWrapperKinds.has(node.parent.kind) ? effectiveParent(node.parent) : node.parent

const isSanctionedPosition = (arrowFunction: ts.ArrowFunction): boolean => {
  const parent = effectiveParent(arrowFunction)

  return sanctionedParentKinds.has(parent.kind)
}

const inlineClosureMatch = (context: RuleContext, arrowFunction: ts.ArrowFunction): RuleMatch =>
  createRuleMatch(context, {
    ruleId,
    node: arrowFunction.equalsGreaterThanToken,
    message: "Avoid arrow functions outside naming and currying positions.",
    hint:
      "Name this function as a top-level const and pass it by reference, currying it when it " +
      "needs values from the enclosing scope. When the expression sequences several steps, " +
      "prefer a generator (Option.gen or Effect.gen) over nesting functions."
  })

const arrowFunctionMatches = (
  arrowFunction: ts.ArrowFunction,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  isSanctionedPosition(arrowFunction) ? [] : [inlineClosureMatch(context, arrowFunction)]

// Declared after its handler: onNode evaluates its arguments at module initialization,
// so a handler passed by name — as this rule requires of itself — must already exist.
const check = onNode([ts.SyntaxKind.ArrowFunction], ts.isArrowFunction, arrowFunctionMatches)

export const noInlineClosures = new Rule({
  id: ruleId,
  description:
    "Disallow arrow functions outside naming positions (const initializers) and currying " +
    "positions (arrow function bodies).",
  check
})
