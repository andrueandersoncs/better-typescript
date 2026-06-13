import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { isReturnTypeDeclaration } from "./tsNode.js"
import type { ReturnTypeDeclaration } from "./tsNode.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-explicit-any-return"

const containsAnyKeyword = (node: ts.Node): boolean => {
  const isAnyKeyword = node.kind === ts.SyntaxKind.AnyKeyword
  const childContainsAnyKeyword = ts.forEachChild(node, containsAnyKeyword) === true

  return [isAnyKeyword, childContainsAnyKeyword].some(Boolean)
}

const declaredTypeContainsAny = (node: ReturnTypeDeclaration): boolean => {
  const typeNode = Option.fromNullable(node.type)

  return Option.exists(typeNode, containsAnyKeyword)
}

const isAnyReturnTypeDeclaration = (node: ts.Node): node is ReturnTypeDeclaration =>
  isReturnTypeDeclaration(node) ? declaredTypeContainsAny(node) : false

const anyReturnTypeMatches = (
  node: ReturnTypeDeclaration,
  context: RuleContext
): ReadonlyArray<RuleMatch> => [
  createRuleMatch(context, {
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

const check = onNode(
  returnTypeDeclarationKinds,
  isAnyReturnTypeDeclaration,
  anyReturnTypeMatches
)

export const noExplicitAnyReturn = new Rule({
  id: ruleId,
  description: "Disallow explicit any in function return types.",
  check
})
