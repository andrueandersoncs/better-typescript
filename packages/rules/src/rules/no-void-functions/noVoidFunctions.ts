import { Array, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import type { FunctionDefinition } from "../../internal/support/functionDefinition.js"
import { isFunctionDefinition } from "../../internal/support/isFunctionDefinition.js"
import { isFunctionInitializer } from "../../internal/support/isFunctionInitializer.js"
import { namedCandidateTarget } from "../../internal/support/namedCandidateTarget.js"
import { isVoidType } from "../../internal/support/isVoidType.js"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"

// Contextual any or unknown permits void because consumers accept void-returning implementations.
const voidCompatibleFlags = ts.TypeFlags.Void | ts.TypeFlags.Any | ts.TypeFlags.Unknown

const isVoidCompatibleType = (type: ts.Type) => (type.flags & voidCompatibleFlags) !== 0

const permitsVoid = (type: ts.Type) =>
  type.isUnion() ? Array.some(type.types, isVoidCompatibleType) : isVoidCompatibleType(type)

// NoVoidFunctionsFact exists because its fields form one stable data contract used by the linter.
export const NoVoidFunctionsFact = Schema.Struct({})

export interface NoVoidFunctionsFact extends Schema.Schema.Type<typeof NoVoidFunctionsFact> {}

// emptyNoVoidFunctionsFact exists because its fields form one stable data contract used by the linter.
export const emptyNoVoidFunctionsFact = NoVoidFunctionsFact.make({})

const voidableFunctionKinds: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration
)

const objectLiteralParent = (declaration: ts.MethodDeclaration) =>
  Option.liftPredicate(ts.isObjectLiteralExpression)(declaration.parent)

const voidFunctionsMatches = (context: MatchContext) => {
  const matchVoidReturningDeclaration = (declaration: FunctionDefinition) => {
    if (!isFunctionDefinition(declaration)) {
      return Array.empty()
    }

    const contextualTypeNode = isFunctionInitializer(declaration)
      ? context.checker.getContextualType(declaration)
      : undefined

    const contextualType = Option.fromNullishOr(contextualTypeNode)

    const signaturePermitsVoid = (signature: ts.Signature) =>
      pipe(context.checker.getReturnTypeOfSignature(signature), permitsVoid)

    const typeHasVoidCallbackSignature = (type: ts.Type) => {
      const callableType = context.checker.getNonNullableType(type)
      const signatures = callableType.getCallSignatures()

      return Array.some(signatures, signaturePermitsVoid)
    }

    const isContextualVoidCallback = Option.exists(contextualType, typeHasVoidCallbackSignature)
    const isContextualVoid = isFunctionInitializer(declaration) && isContextualVoidCallback

    const literalHasContextualType = (literal: ts.ObjectLiteralExpression) => {
      const literalContextualTypeNode = context.checker.getContextualType(literal)
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

    const declaredSignature = context.checker.getSignatureFromDeclaration(declaration)
    const signature = Option.fromNullishOr(declaredSignature)

    const signatureReturnsVoid = (resolved: ts.Signature) =>
      pipe(context.checker.getReturnTypeOfSignature(resolved), isVoidType)

    const declarationReturnsVoid = Option.exists(signature, signatureReturnsVoid)

    if (!declarationReturnsVoid) {
      return Array.empty()
    }

    const node = namedCandidateTarget(declaration)
    const match = makeNodeMatch(node, emptyNoVoidFunctionsFact)

    return Array.of(match)
  }

  return matchVoidReturningDeclaration
}

export const noVoidFunctionsScanner =
  makeNodeScanner(voidableFunctionKinds)(isFunctionDefinition)(voidFunctionsMatches)
