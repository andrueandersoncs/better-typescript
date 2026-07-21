import { Array, Option, pipe, Schema } from "effect"
import * as ts from "typescript"
import {
  namedDetectionTarget,
  isFunctionDefinition,
  isFunctionInitializer,
  type FunctionDefinition
} from "../support/tsNode.js"
import { isVoidType, permitsVoid } from "../support/tsType.js"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch, type MatchContext } from "../matcher/data.js"

// NoVoidFunctionsFact is empty payload because guidance and matchers share identity.
export const NoVoidFunctionsFact = Schema.Struct({})

export interface NoVoidFunctionsFact extends Schema.Schema.Type<typeof NoVoidFunctionsFact> {}

// emptyNoVoidFunctionsFact is the shared empty fact because guidance and matchers share identity.
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
  const checker = context.checker

  const matchVoidReturningDeclaration = (declaration: FunctionDefinition) => {
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
    const match = nodeMatch(node, emptyNoVoidFunctionsFact)

    return Array.of(match)
  }

  return matchVoidReturningDeclaration
}

export const noVoidFunctionsMatcher =
  nodeMatcher(voidableFunctionKinds)(isFunctionDefinition)(voidFunctionsMatches)
