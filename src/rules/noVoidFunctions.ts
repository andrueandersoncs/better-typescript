import { Option, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import type { CreateMatch } from "./ruleMatch.js"
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
  (checker: ts.TypeChecker) =>
  (signature: ts.Signature): boolean => {
    const returnType = checker.getReturnTypeOfSignature(signature)

    return isVoidType(returnType)
  }

const returnsVoid =
  (checker: ts.TypeChecker) =>
  (declaration: VoidableFunction): boolean => {
    const declaredSignature = checker.getSignatureFromDeclaration(declaration)
    const signature = Option.fromNullable(declaredSignature)

    return Option.exists(signature, signatureReturnsVoid(checker))
  }

const signaturePermitsVoid =
  (checker: ts.TypeChecker) =>
  (signature: ts.Signature): boolean => {
    const returnType = checker.getReturnTypeOfSignature(signature)

    return permitsVoid(returnType)
  }

const contextualSignaturePermitsVoid =
  (checker: ts.TypeChecker) =>
  (contextualType: ts.Type): boolean =>
    contextualType.getCallSignatures().some(signaturePermitsVoid(checker))

// Void imposed by a callback's contextual type (e.g. React's EffectCallback) is the consumer's contract, not the author's choice, so no Effect-returning alternative exists.
const isContextuallyVoidCallback =
  (checker: ts.TypeChecker) =>
  (initializer: FunctionInitializer): boolean => {
    const contextualTypeNode = checker.getContextualType(initializer)
    const contextualType = Option.fromNullable(contextualTypeNode)

    return Option.exists(
      contextualType,
      contextualSignaturePermitsVoid(checker)
    )
  }

const objectLiteralParent = (
  declaration: ts.MethodDeclaration
): Option.Option<ts.ObjectLiteralExpression> =>
  Option.liftPredicate(ts.isObjectLiteralExpression)(declaration.parent)

const literalHasContextualType =
  (checker: ts.TypeChecker) =>
  (literal: ts.ObjectLiteralExpression): boolean => {
    const contextualTypeNode = checker.getContextualType(literal)
    const contextualType = Option.fromNullable(contextualTypeNode)

    return Option.isSome(contextualType)
  }

// A method inside a contextually typed object literal (`const l: Logger = { log() {} }`) implements the annotated interface's contract, not an author-chosen signature.
const isContextuallyTypedObjectMethod =
  (checker: ts.TypeChecker) =>
  (declaration: VoidableFunction): boolean =>
    pipe(
      Option.liftPredicate(ts.isMethodDeclaration)(declaration),
      Option.flatMap(objectLiteralParent),
      Option.exists(literalHasContextualType(checker))
    )

const voidFunctionMatch =
  (match: CreateMatch) =>
  (declaration: VoidableFunction): RuleMatch => {
    const node = namedNodeReportTarget(declaration)

    return match({
      ruleId,
      node,
      message: "Avoid functions that return void.",
      hint:
        "A void function either does nothing or performs a side-effect. If it does nothing, " +
        "delete it. If it performs a side-effect, make it return an Effect — for example wrap " +
        "the body in Effect.sync(() => ...) or Effect.gen so the side-effect is described, not " +
        "run. When a third-party API requires a void callback, annotate the value with that " +
        "API's callback type so the void contract is the consumer's, not yours."
    })
  }

// The context stage runs once per file, so every partial below is shared by all voidable functions the dispatcher feeds to matches.
const voidFunctionMatches = (context: RuleContext) => {
  const isContextualVoidCallback = isContextuallyVoidCallback(context.checker)
  const isContextualObjectMethod = isContextuallyTypedObjectMethod(
    context.checker
  )
  const declarationReturnsVoid = returnsVoid(context.checker)
  const ruleMatch = voidFunctionMatch(createRuleMatch(context))

  const matches = (declaration: VoidableFunction): ReadonlyArray<RuleMatch> => {
    const isContextualVoid =
      isFunctionInitializer(declaration) &&
      isContextualVoidCallback(declaration)
    const isContextualMethod = isContextualObjectMethod(declaration)
    const isConsumerContract = isContextualVoid || isContextualMethod

    return isConsumerContract
      ? []
      : pipe(
          Option.liftPredicate(declarationReturnsVoid)(declaration),
          Option.map(ruleMatch),
          Option.toArray
        )
  }

  return matches
}

const check = onNode(voidableFunctionKinds)(isVoidableFunction)(
  voidFunctionMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/log.ts",
  code: `export const logMessage = (msg: string): void => {
  console.log(msg)
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/log.ts",
  code: `import { Effect } from "effect"

export const logMessage = (msg: string) =>
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
