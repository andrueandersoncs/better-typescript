import { Array, HashSet, Option, Schema } from "effect"
import * as ts from "typescript"
import { isInAmbientContext } from "../support/tsNode.js"
import { hasCallSignature, isVoidType } from "../support/tsType.js"
import { strictEqual } from "../equivalence.js"
import { nodeMatcher } from "../matcher/matcher.js"
import { makeNodeMatch, type MatchContext } from "../matcher/data.js"

// NoCallbacksFact is empty payload because guidance and matchers share identity.
export const NoCallbacksFact = Schema.Struct({})

export interface NoCallbacksFact extends Schema.Schema.Type<typeof NoCallbacksFact> {}

// emptyNoCallbacksFact is the shared empty fact because guidance and matchers share identity.
export const emptyNoCallbacksFact = NoCallbacksFact.make({})

// CallbackStyleDeclaration is a local syntax union because matchers need one narrowed node shape.
export type CallbackStyleDeclaration =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration
  | ts.MethodSignature
  | ts.CallSignatureDeclaration
  | ts.FunctionTypeNode

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
  const parent = typeNode.parent
  const isValueDeclaration = ts.isVariableDeclaration(parent) || ts.isPropertyDeclaration(parent)

  if (isValueDeclaration) {
    const isTypeAnnotation = strictEqual(typeNode)(parent.type)
    const initializer = Option.fromNullishOr(parent.initializer)
    const isNotRuntimeFunction = !Option.exists(initializer, isRuntimeFunctionLike)

    return isTypeAnnotation && isNotRuntimeFunction
  }

  const aliasDeclaration = Option.liftPredicate(ts.isTypeAliasDeclaration)(parent)

  const hasTypeAliasFunctionType = Option.exists(aliasDeclaration, (alias) => {
    const aliasTypeIsNode = strictEqual(typeNode)(alias.type)

    return aliasTypeIsNode
  })

  const propertySignature = Option.liftPredicate(ts.isPropertySignature)(parent)

  const hasPropertySignatureFunctionType = Option.exists(propertySignature, (signature) => {
    const signatureTypeIsNode = strictEqual(typeNode)(signature.type)

    return signatureTypeIsNode
  })

  return hasTypeAliasFunctionType || hasPropertySignatureFunctionType
}

const callbacksMatches = (context: MatchContext) => {
  const checker = context.checker

  const matchCallbackStyleDeclaration = (declaration: CallbackStyleDeclaration) => {
    if (isInAmbientContext(declaration)) {
      return Array.empty()
    }

    const declaredSignature = checker.getSignatureFromDeclaration(declaration)
    const signature = Option.fromNullishOr(declaredSignature)

    const parameterIsFunctionArgument = (parameter: ts.ParameterDeclaration) => {
      const parameterType = checker.getTypeAtLocation(parameter)
      const parameterHasCallSignature = hasCallSignature(checker)(parameterType)
      const restToken = Option.fromNullishOr(parameter.dotDotDotToken)

      if (Option.isNone(restToken)) {
        return parameterHasCallSignature
      }

      const indexType = checker.getIndexTypeOfType(parameterType, ts.IndexKind.Number)
      const elementType = Option.fromNullishOr(indexType)
      const elementHasCallSignature = Option.exists(elementType, hasCallSignature(checker))
      const callSignatureIndicators = Array.make(parameterHasCallSignature, elementHasCallSignature)

      return Array.some(callSignatureIndicators, Boolean)
    }

    const signatureHasCallbackShape = (resolvedSignature: ts.Signature) => {
      const returnType = checker.getReturnTypeOfSignature(resolvedSignature)
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

export const noCallbacksMatcher =
  nodeMatcher(callbackStyleKinds)(isCallbackStyleCandidate)(callbacksMatches)
