import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { namedNodeReportTarget } from "./tsNode.js"
import { isVoidType } from "./tsType.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-void-functions"

type VoidableFunction =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration

const voidableFunctionKinds: ReadonlyArray<ts.SyntaxKind> = [
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration
]

const isVoidableFunction = (node: ts.Node): node is VoidableFunction =>
  [
    ts.isFunctionDeclaration(node),
    ts.isFunctionExpression(node),
    ts.isArrowFunction(node),
    ts.isMethodDeclaration(node)
  ].some(Boolean)

const signatureReturnsVoid =
  (context: RuleContext) =>
  (signature: ts.Signature): boolean => {
    const returnType = context.checker.getReturnTypeOfSignature(signature)

    return isVoidType(returnType)
  }

const returnsVoid =
  (context: RuleContext) =>
  (declaration: VoidableFunction): boolean => {
    const declaredSignature = context.checker.getSignatureFromDeclaration(declaration)
    const signature = Option.fromNullable(declaredSignature)

    return Option.exists(signature, signatureReturnsVoid(context))
  }

const voidFunctionMatch =
  (context: RuleContext) =>
  (declaration: VoidableFunction): RuleMatch => {
    const node = namedNodeReportTarget(declaration)

    return createRuleMatch(context, {
      ruleId,
      node,
      message: "Avoid functions that return void.",
      hint:
        "A void function either does nothing or performs a side-effect. If it does nothing, " +
        "delete it. If it performs a side-effect, make it return an Effect — for example wrap " +
        "the body in Effect.sync(() => ...) or Effect.gen so the side-effect is described, not run."
    })
  }

const voidFunctionMatches = (
  declaration: VoidableFunction,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  Option.liftPredicate(returnsVoid(context))(declaration).pipe(
    Option.map(voidFunctionMatch(context)),
    Option.toArray
  )

const check = onNode(voidableFunctionKinds, isVoidableFunction, voidFunctionMatches)

export const noVoidFunctions = new Rule({
  id: ruleId,
  description: "Disallow functions that return void in favor of Effect-returning functions.",
  check
})
