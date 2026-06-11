import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-nested-if-statements"

const nestedScopeBoundaryKinds = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.SetAccessor
])

const isNestedScopeBoundary = (node: ts.Node): boolean =>
  nestedScopeBoundaryKinds.has(node.kind)

const isElseIfStatement = (child: ts.Node, parent: ts.IfStatement): boolean =>
  parent.elseStatement === child

const containingIfStatementFrom = (
  child: ts.Node,
  parent: Option.Option<ts.Node>
): Option.Option<ts.IfStatement> => {
  if (Option.isNone(parent)) {
    return Option.none()
  }

  const parentNode = parent.value

  if (isNestedScopeBoundary(parentNode)) {
    return Option.none()
  }

  if (!ts.isIfStatement(parentNode)) {
    return containingIfStatementFrom(parentNode, Option.fromNullable(parentNode.parent))
  }

  return isElseIfStatement(child, parentNode)
    ? containingIfStatementFrom(parentNode, Option.fromNullable(parentNode.parent))
    : Option.some(parentNode)
}

const containingIfStatement = (
  ifStatement: ts.IfStatement
): Option.Option<ts.IfStatement> =>
  containingIfStatementFrom(ifStatement, Option.fromNullable(ifStatement.parent))

const isNestedIfStatement = (ifStatement: ts.IfStatement): boolean =>
  Option.isSome(containingIfStatement(ifStatement))

const nestedIfMatches = (
  ifStatement: ts.IfStatement,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  isNestedIfStatement(ifStatement)
    ? [
        createRuleMatch(context, {
          ruleId,
          node: ifStatement,
          message: "Avoid nesting if statements.",
          hint:
            "Combine related conditions with boolean operators, or use an early return so this " +
            "condition can remain a single-level if statement."
        })
      ]
    : []

export const noNestedIfStatements: Rule = {
  id: ruleId,
  description: "Disallow nested if statements in favor of boolean operators or early returns.",
  check: onNode([ts.SyntaxKind.IfStatement], ts.isIfStatement, nestedIfMatches)
}
