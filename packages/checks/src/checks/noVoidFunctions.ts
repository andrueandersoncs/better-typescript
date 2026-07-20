import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import { namedDetectionTarget } from "./support/tsNode.js"
import { isFunctionDefinition, isFunctionInitializer } from "./support/tsNode.js"
import { isVoidType, permitsVoid } from "./support/tsType.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { makeDetection } from "@better-typescript/core/engine/check"
import { makeCheck } from "../defineCheck.js"

const voidableFunctionKinds: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration
)

const objectLiteralParent = (declaration: ts.MethodDeclaration) =>
  Option.liftPredicate(ts.isObjectLiteralExpression)(declaration.parent)

const voidFunctionMatches = (context: CheckContext) => {
  const checker = context.checker
  const match = makeDetection(context)

  const matches = (declaration: ts.Node): ReadonlyArray<Detection> => {
    if (!isFunctionDefinition(declaration)) {
      return Array.empty()
    }

    const contextualTypeNode = isFunctionInitializer(declaration)
      ? checker.getContextualType(declaration)
      : undefined

    const contextualType = Option.fromNullishOr(contextualTypeNode)

    const signaturePermitsVoid = (signature: ts.Signature) =>
      pipe(checker.getReturnTypeOfSignature(signature), permitsVoid)

    const typeHasVoidCallbackSignature = (type: ts.Type) => {
      const callableType = checker.getNonNullableType(type)
      const signatures = callableType.getCallSignatures()

      return Array.some(signatures, signaturePermitsVoid)
    }

    const isContextualVoidCallback = Option.exists(contextualType, typeHasVoidCallbackSignature)
    const isContextualVoid = isFunctionInitializer(declaration) && isContextualVoidCallback

    const literalHasContextualType = (literal: ts.ObjectLiteralExpression) => {
      const literalContextualTypeNode = checker.getContextualType(literal)
      const literalContextualType = Option.fromNullishOr(literalContextualTypeNode)

      return Option.isSome(literalContextualType)
    }

    const isContextualMethod = pipe(
      Option.liftPredicate(ts.isMethodDeclaration)(declaration),
      Option.flatMap(objectLiteralParent),
      Option.exists(literalHasContextualType)
    )

    const isConsumerContract = isContextualVoid || isContextualMethod

    if (isConsumerContract) {
      return Array.empty()
    }

    const declaredSignature = checker.getSignatureFromDeclaration(declaration)
    const signature = Option.fromNullishOr(declaredSignature)

    const signatureReturnsVoid = (resolved: ts.Signature) =>
      pipe(checker.getReturnTypeOfSignature(resolved), isVoidType)

    const declarationReturnsVoid = Option.exists(signature, signatureReturnsVoid)

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

export const noVoidFunctions = makeCheck(
  "no-void-functions",
  voidableFunctionKinds,
  isFunctionDefinition,
  voidFunctionMatches
)
