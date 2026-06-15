import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-void-functions"

// Functions that carry a body and could instead return a value. Set accessors and
// constructors are excluded on purpose: both are required by the language to be
// void, so flagging them would describe a rule the author cannot satisfy.
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

const isVoidType = (type: ts.Type): boolean => (type.flags & ts.TypeFlags.Void) !== 0

const signatureReturnsVoid =
  (context: RuleContext) =>
  (signature: ts.Signature): boolean => {
    const returnType = context.checker.getReturnTypeOfSignature(signature)

    return isVoidType(returnType)
  }

// The signature comes from the declaration, so inferred void bodies are caught the
// same as an explicit `: void` annotation — both resolve to the void return type.
const returnsVoid =
  (context: RuleContext) =>
  (declaration: VoidableFunction): boolean => {
    const declaredSignature = context.checker.getSignatureFromDeclaration(declaration)
    const signature = Option.fromNullable(declaredSignature)

    return Option.exists(signature, signatureReturnsVoid(context))
  }

// Methods and named functions report at their name; anonymous function expressions
// and arrows have no name, so the whole declaration is the most precise anchor.
const reportNode = (declaration: VoidableFunction): ts.Node =>
  Option.fromNullable(declaration.name).pipe(Option.getOrElse(() => declaration))

const voidFunctionMatch =
  (context: RuleContext) =>
  (declaration: VoidableFunction): RuleMatch =>
    createRuleMatch(context, {
      ruleId,
      node: reportNode(declaration),
      message: "Avoid functions that return void.",
      hint:
        "A void function either does nothing or performs a side-effect. If it does nothing, " +
        "delete it. If it performs a side-effect, make it return an Effect — for example wrap " +
        "the body in Effect.sync(() => ...) or Effect.gen so the side-effect is described, not run."
    })

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
