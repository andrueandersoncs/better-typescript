import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import {
  isFunctionInitializer,
  namedDetectionTarget
} from "./support/tsNode.js"
import { isVoidType, permitsVoid } from "./support/tsType.js"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

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

const isVoidableFunction = (node: ts.Node): node is VoidableFunction => {
  const conditions = [
    ts.isFunctionDeclaration(node),
    ts.isFunctionExpression(node),
    ts.isArrowFunction(node),
    ts.isMethodDeclaration(node)
  ]
  return Array.some(conditions, Boolean)
}

const objectLiteralParent = (
  declaration: ts.MethodDeclaration
): Option.Option<ts.ObjectLiteralExpression> =>
  Option.liftPredicate(ts.isObjectLiteralExpression)(declaration.parent)

const voidFunctionMatches = (context: CheckContext) => {
  const checker = context.checker
  const match = detection(context)

  const matches = (declaration: VoidableFunction): ReadonlyArray<Detection> => {
    const contextualTypeNode = isFunctionInitializer(declaration)
      ? checker.getContextualType(declaration)
      : undefined
    const contextualType = Option.fromNullable(contextualTypeNode)
    const isContextualVoidCallback = Option.exists(
      contextualType,
      (type) => {
        const callableType = checker.getNonNullableType(type)
        const signatures = callableType.getCallSignatures()

        return Array.some(signatures, (signature) => {
          const returnType = checker.getReturnTypeOfSignature(signature)

          return permitsVoid(returnType)
        })
      }
    )
    const isContextualVoid =
      isFunctionInitializer(declaration) && isContextualVoidCallback
    const isContextualMethod = pipe(
      Option.liftPredicate(ts.isMethodDeclaration)(declaration),
      Option.flatMap(objectLiteralParent),
      Option.exists((literal) => {
        const literalContextualTypeNode = checker.getContextualType(literal)
        const literalContextualType = Option.fromNullable(
          literalContextualTypeNode
        )

        return Option.isSome(literalContextualType)
      })
    )
    const isConsumerContract = isContextualVoid || isContextualMethod

    if (isConsumerContract) {
      return []
    }

    const declaredSignature = checker.getSignatureFromDeclaration(declaration)
    const signature = Option.fromNullable(declaredSignature)
    const declarationReturnsVoid = Option.exists(signature, (resolved) => {
      const returnType = checker.getReturnTypeOfSignature(resolved)

      return isVoidType(returnType)
    })

    if (!declarationReturnsVoid) {
      return []
    }

    const node = namedDetectionTarget(declaration)

    return [
      match({
        node,
        message: "Avoid functions that return void.",
        hint:
          "A void function either does nothing or performs a side-effect. If it does nothing, " +
          "delete it. If it performs a side-effect, make it return an Effect — for example wrap " +
          "the body in Effect.sync(() => ...) or Effect.gen so the side-effect is described, not " +
          "run. When a third-party API requires a void callback, annotate the value with that " +
          "API's callback type so the void contract is the consumer's, not yours."
      })
    ]
  }

  return matches
}

const check = nodeCheck(voidableFunctionKinds)(isVoidableFunction)(
  voidFunctionMatches
)

export const noVoidFunctions: Check = check

export const noVoidFunctionsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-void-functions")
