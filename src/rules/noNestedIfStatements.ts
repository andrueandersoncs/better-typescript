import { HashSet, Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-nested-if-statements"

const nestedScopeBoundaryKinds = HashSet.make(
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.SetAccessor
)

const containingIfStatementFrom = (
  child: ts.Node,
  parent: Option.Option<ts.Node>
): Option.Option<ts.IfStatement> => {
  if (Option.isNone(parent)) {
    return Option.none()
  }

  const parentNode = parent.value

  if (HashSet.has(nestedScopeBoundaryKinds, parentNode.kind)) {
    return Option.none()
  }

  const grandparent = Option.fromNullable(parentNode.parent)

  if (!ts.isIfStatement(parentNode)) {
    return containingIfStatementFrom(parentNode, grandparent)
  }

  const isElseBranch = parentNode.elseStatement === child

  return isElseBranch
    ? containingIfStatementFrom(parentNode, grandparent)
    : Option.some(parentNode)
}

const nestedIfMatches = (
  ifStatement: ts.IfStatement,
  context: RuleContext
): ReadonlyArray<RuleMatch> => {
  const parentOption = Option.fromNullable(ifStatement.parent)
  const containingIf = containingIfStatementFrom(ifStatement, parentOption)

  return Option.isSome(containingIf)
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
}

const check = onNode(
  [ts.SyntaxKind.IfStatement],
  ts.isIfStatement,
  nestedIfMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/access.ts",
  code: `if (user) {
  if (user.isActive) {
    grantAccess()
  }
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/access.ts",
  code: `if (!user) {
  return
}
if (user.isActive) {
  grantAccess()
}`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noNestedIfStatements = new Rule({
  id: ruleId,
  description:
    "Disallow nested if statements in favor of boolean operators or early returns.",
  example,
  check
})
