import { Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import {
  isFunctionInitializer,
  namedDetectionTarget
} from "./support/tsNode.js"
import { isVoidType, permitsVoid } from "./support/tsType.js"
import type { FunctionInitializer } from "./support/tsNode.js"
import { detection } from "@better-typescript/core/engine/location"
import type { MakeDetection } from "@better-typescript/core/engine/location"
import type { Check, CheckContext } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example"

import {
  fixtureRefactorExamples
} from "../fixtureExamples.js"
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

// Judge the callable contextual type because DOM handler slots include null even when the author's function cannot be null.
const contextualSignaturePermitsVoid =
  (checker: ts.TypeChecker) =>
  (contextualType: ts.Type): boolean => {
    const callableType = checker.getNonNullableType(contextualType)

    return callableType.getCallSignatures().some(signaturePermitsVoid(checker))
  }

// Exempt consumer-imposed void because the author cannot replace that external callback contract with Effect.
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

// Exempt contextually typed object methods because they implement an annotated interface rather than an author-chosen signature.
const isContextuallyTypedObjectMethod =
  (checker: ts.TypeChecker) =>
  (declaration: VoidableFunction): boolean =>
    pipe(
      Option.liftPredicate(ts.isMethodDeclaration)(declaration),
      Option.flatMap(objectLiteralParent),
      Option.exists(literalHasContextualType(checker))
    )

const voidFunctionMatch =
  (match: MakeDetection) =>
  (declaration: VoidableFunction): Detection => {
    const node = namedDetectionTarget(declaration)

    return match({
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

const voidFunctionMatches = (context: CheckContext) => {
  const isContextualVoidCallback = isContextuallyVoidCallback(context.checker)
  const isContextualObjectMethod = isContextuallyTypedObjectMethod(
    context.checker
  )
  const declarationReturnsVoid = returnsVoid(context.checker)
  const ruleMatch = voidFunctionMatch(detection(context))

  const matches = (declaration: VoidableFunction): ReadonlyArray<Detection> => {
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

const check = nodeCheck(voidableFunctionKinds)(isVoidableFunction)(
  voidFunctionMatches
)

export const noVoidFunctions: Check = check

export const noVoidFunctionsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-void-functions")
