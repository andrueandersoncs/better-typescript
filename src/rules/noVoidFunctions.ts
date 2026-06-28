import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { isFunctionInitializer, namedNodeReportTarget } from "./tsNode.js"
import { isVoidType, permitsVoid } from "./tsType.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { FunctionInitializer } from "./tsNode.js"
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
    const declaredSignature =
      context.checker.getSignatureFromDeclaration(declaration)
    const signature = Option.fromNullable(declaredSignature)

    return Option.exists(signature, signatureReturnsVoid(context))
  }

const signaturePermitsVoid =
  (context: RuleContext) =>
  (signature: ts.Signature): boolean => {
    const returnType = context.checker.getReturnTypeOfSignature(signature)

    return permitsVoid(returnType)
  }

const contextualSignaturePermitsVoid =
  (context: RuleContext) =>
  (contextualType: ts.Type): boolean =>
    contextualType.getCallSignatures().some(signaturePermitsVoid(context))

// Void imposed by a callback's contextual type (e.g. React's EffectCallback) is the consumer's contract, not the author's choice, so no Effect-returning alternative exists.
const isContextuallyVoidCallback =
  (context: RuleContext) =>
  (initializer: FunctionInitializer): boolean => {
    const contextualTypeNode = context.checker.getContextualType(initializer)
    const contextualType = Option.fromNullable(contextualTypeNode)

    return Option.exists(
      contextualType,
      contextualSignaturePermitsVoid(context)
    )
  }

const isContextuallyImposedVoid = (
  declaration: VoidableFunction,
  context: RuleContext
): boolean =>
  isFunctionInitializer(declaration) &&
  isContextuallyVoidCallback(context)(declaration)

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
  isContextuallyImposedVoid(declaration, context)
    ? []
    : Option.liftPredicate(returnsVoid(context))(declaration).pipe(
        Option.map(voidFunctionMatch(context)),
        Option.toArray
      )

const check = onNode(
  voidableFunctionKinds,
  isVoidableFunction,
  voidFunctionMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/log.ts",
  code: `const logMessage = (msg: string): void => {
  console.log(msg)
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/log.ts",
  code: `const logMessage = (msg: string) =>
  Effect.sync(() => console.log(msg))`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noVoidFunctions = new Rule({
  id: ruleId,
  description:
    "Disallow functions that return void in favor of Effect-returning functions.",
  example,
  check
})
