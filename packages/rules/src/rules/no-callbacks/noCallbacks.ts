import { Array, HashSet, Option, Schema } from "effect"
import * as ts from "typescript"
import { isInAmbientContext } from "../../internal/support/isDeclareKeyword.js"
import { hasCallSignature } from "../../internal/support/hasCallSignature.js"
import { isVoidType } from "../../internal/support/isVoidType.js"
import { strictEqual } from "../../internal/equivalence.js"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import type { CallbackStyleDeclaration } from "./callbackStyleDeclaration.js"

// NoCallbacksFact exists because its fields form one stable data contract used by the linter.
export const NoCallbacksFact = Schema.Struct({})

export interface NoCallbacksFact extends Schema.Schema.Type<typeof NoCallbacksFact> {}

// emptyNoCallbacksFact exists because its fields form one stable data contract used by the linter.
export const emptyNoCallbacksFact = NoCallbacksFact.make({})

const transparentTypeNodeKinds = HashSet.make(
  ts.SyntaxKind.ParenthesizedType,
  ts.SyntaxKind.UnionType,
  ts.SyntaxKind.IntersectionType
)

const effectiveCallableTypeNode = (typeNode: ts.TypeNode): ts.TypeNode =>
  HashSet.has(transparentTypeNodeKinds, typeNode.parent.kind)
    ? effectiveCallableTypeNode(typeNode.parent as ts.TypeNode)
    : typeNode

const isRuntimeFunctionLike = (node: ts.Expression): boolean =>
  ts.isFunctionExpression(node) || ts.isArrowFunction(node)

const isCallbackStyleCandidate = (node: ts.Node): node is CallbackStyleDeclaration => {
  const isFunctionOrExpression = ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)
  const isArrowOrMethod = ts.isArrowFunction(node) || ts.isMethodDeclaration(node)
  const isSignature = ts.isMethodSignature(node) || ts.isCallSignatureDeclaration(node)
  const isFunctionOrArrow = isFunctionOrExpression || isArrowOrMethod
  const isDirectCallbackKind = isFunctionOrArrow || isSignature

  if (!ts.isFunctionTypeNode(node)) {
    return isDirectCallbackKind
  }

  const typeNode = effectiveCallableTypeNode(node)

  const isValueDeclaration =
    ts.isVariableDeclaration(typeNode.parent) || ts.isPropertyDeclaration(typeNode.parent)

  if (isValueDeclaration) {
    const isTypeAnnotation = strictEqual(typeNode)(typeNode.parent.type)
    const initializer = Option.fromNullishOr(typeNode.parent.initializer)
    const isNotRuntimeFunction = !Option.exists(initializer, isRuntimeFunctionLike)

    return isTypeAnnotation && isNotRuntimeFunction
  }

  const aliasDeclaration = Option.liftPredicate(ts.isTypeAliasDeclaration)(typeNode.parent)

  const hasTypeAliasFunctionType = Option.exists(aliasDeclaration, (alias) => {
    const aliasTypeIsNode = strictEqual(typeNode)(alias.type)

    return aliasTypeIsNode
  })

  const propertySignature = Option.liftPredicate(ts.isPropertySignature)(typeNode.parent)

  const hasPropertySignatureFunctionType = Option.exists(propertySignature, (signature) => {
    const signatureTypeIsNode = strictEqual(typeNode)(signature.type)

    return signatureTypeIsNode
  })

  return hasTypeAliasFunctionType || hasPropertySignatureFunctionType
}

const callbacksMatches = (context: MatchContext) => {
  const matchCallbackStyleDeclaration = (declaration: CallbackStyleDeclaration) => {
    if (isInAmbientContext(declaration)) {
      return Array.empty()
    }

    const declaredSignature = context.checker.getSignatureFromDeclaration(declaration)
    const signature = Option.fromNullishOr(declaredSignature)

    const parameterIsFunctionArgument = (parameter: ts.ParameterDeclaration) => {
      const parameterType = context.checker.getTypeAtLocation(parameter)
      const parameterHasCallSignature = hasCallSignature(context.checker)(parameterType)
      const restToken = Option.fromNullishOr(parameter.dotDotDotToken)

      if (Option.isNone(restToken)) {
        return parameterHasCallSignature
      }

      const indexType = context.checker.getIndexTypeOfType(parameterType, ts.IndexKind.Number)
      const elementType = Option.fromNullishOr(indexType)
      const elementHasCallSignature = Option.exists(elementType, hasCallSignature(context.checker))
      const callSignatureIndicators = Array.make(parameterHasCallSignature, elementHasCallSignature)

      return Array.some(callSignatureIndicators, Boolean)
    }

    const signatureHasCallbackShape = (resolvedSignature: ts.Signature) => {
      const returnType = context.checker.getReturnTypeOfSignature(resolvedSignature)
      const returnsVoid = isVoidType(returnType)
      const hasFunctionArgument = Array.some(declaration.parameters, parameterIsFunctionArgument)

      return returnsVoid && hasFunctionArgument
    }

    const isCallback = Option.exists(signature, signatureHasCallbackShape)

    if (!isCallback) {
      return Array.empty()
    }

    const match = makeNodeMatch(declaration, emptyNoCallbacksFact)

    return Array.of(match)
  }

  return matchCallbackStyleDeclaration
}

const callbackStyleKinds = Array.make(
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.MethodSignature,
  ts.SyntaxKind.CallSignature,
  ts.SyntaxKind.FunctionType
)

export const noCallbacksScanner =
  makeNodeScanner(callbackStyleKinds)(isCallbackStyleCandidate)(callbacksMatches)
