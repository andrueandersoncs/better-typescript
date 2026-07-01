import { Option, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { isReturnTypeDeclaration, returnTypeNode } from "./tsNode.js"
import type { ReturnTypeDeclaration } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-explicit-any-return"

const containsAnyKeyword = (node: ts.Node): boolean => {
  const isAnyKeyword = node.kind === ts.SyntaxKind.AnyKeyword
  const childContainsAnyKeyword =
    ts.forEachChild(node, containsAnyKeyword) === true

  return [isAnyKeyword, childContainsAnyKeyword].some(Boolean)
}

const isAnyReturnTypeDeclaration = (
  node: ts.Node
): node is ReturnTypeDeclaration =>
  pipe(
    Option.liftPredicate(isReturnTypeDeclaration)(node),
    Option.flatMap(returnTypeNode),
    Option.exists(containsAnyKeyword)
  )

const anyReturnTypeMatches =
  (context: RuleContext) =>
  (node: ReturnTypeDeclaration): ReadonlyArray<RuleMatch> => [
    createRuleMatch(context)({
      ruleId,
      node,
      message: "Avoid function return types that include any.",
      hint:
        "Declare a precise return type instead of any. If the value is unknown at a boundary, " +
        "use unknown and narrow before use."
    })
  ]

const returnTypeDeclarationKinds: ReadonlyArray<ts.SyntaxKind> = [
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.MethodSignature,
  ts.SyntaxKind.CallSignature,
  ts.SyntaxKind.FunctionType,
  ts.SyntaxKind.GetAccessor
]

const check = onNode(returnTypeDeclarationKinds)(isAnyReturnTypeDeclaration)(anyReturnTypeMatches)

const badExample = new ExampleSnippet({
  filePath: "src/config.ts",
  code: `const parseConfig = (raw: string): any =>
  JSON.parse(raw)`
})

const goodExample = new ExampleSnippet({
  filePath: "src/config.ts",
  code: `const parseConfig = (raw: string): unknown =>
  JSON.parse(raw)`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noExplicitAnyReturn = new Rule({
  id: ruleId,
  description: "Disallow explicit any in function return types.",
  example,
  check
})
