import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import { namedDetectionTarget } from "./support/tsNode.js"
import { isFunctionDefinition, isFunctionInitializer } from "./support/tsNode.js"
import { isVoidType, permitsVoid } from "./support/tsType.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
import { nodeCheck, detection } from "@better-typescript/core/engine/check"

const voidableFunctionKinds: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration
)

const objectLiteralParent = (
  declaration: ts.MethodDeclaration
): Option.Option<ts.ObjectLiteralExpression> =>
  Option.liftPredicate(ts.isObjectLiteralExpression)(declaration.parent)

const voidFunctionMatches = (context: CheckContext) => {
  const checker = context.checker
  const match = detection(context)

  const matches = (declaration: ts.Node): ReadonlyArray<Detection> => {
    if (!isFunctionDefinition(declaration)) {
      return Array.empty()
    }

    const contextualTypeNode = isFunctionInitializer(declaration)
      ? checker.getContextualType(declaration)
      : undefined

    const contextualType = Option.fromNullable(contextualTypeNode)

    const isContextualVoidCallback = Option.exists(contextualType, (type) => {
      const callableType = checker.getNonNullableType(type)
      const signatures = callableType.getCallSignatures()

      return Array.some(signatures, (signature) =>
        pipe(checker.getReturnTypeOfSignature(signature), permitsVoid)
      )
    })

    const isContextualVoid = isFunctionInitializer(declaration) && isContextualVoidCallback

    const isContextualMethod = pipe(
      Option.liftPredicate(ts.isMethodDeclaration)(declaration),
      Option.flatMap(objectLiteralParent),
      Option.exists((literal) => {
        const literalContextualTypeNode = checker.getContextualType(literal)
        const literalContextualType = Option.fromNullable(literalContextualTypeNode)

        return Option.isSome(literalContextualType)
      })
    )

    const isConsumerContract = isContextualVoid || isContextualMethod

    if (isConsumerContract) {
      return Array.empty()
    }

    const declaredSignature = checker.getSignatureFromDeclaration(declaration)
    const signature = Option.fromNullable(declaredSignature)

    const declarationReturnsVoid = Option.exists(signature, (resolved) =>
      pipe(checker.getReturnTypeOfSignature(resolved), isVoidType)
    )

    if (!declarationReturnsVoid) {
      return Array.empty()
    }

    const node = namedDetectionTarget(declaration)

    const voidFunctionMatch = match({
      node,
      message: "Avoid functions that return void.",
      hint:
        "A void function either does nothing or performs a side-effect. If it does nothing, " +
        "delete it. If it performs a side-effect, make it return an Effect — for example wrap " +
        "the body in Effect.sync(() => ...) or Effect.gen so the side-effect is described, not " +
        "run. When a third-party API requires a void callback, annotate the value with that " +
        "API's callback type so the void contract is the consumer's, not yours."
    })

    return Array.of(voidFunctionMatch)
  }

  return matches
}

const check = nodeCheck(voidableFunctionKinds)(isFunctionDefinition)(voidFunctionMatches)

export const noVoidFunctions: Check = check

export const noVoidFunctionsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-void-functions")
