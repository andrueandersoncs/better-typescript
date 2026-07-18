import { Array, HashSet, Option } from "effect"
import * as ts from "typescript"
import { isInAmbientContext } from "./support/tsNode.js"
import { hasCallSignature, isVoidType } from "./support/tsType.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"

// CallbackStyleDeclaration is shared callback syntax because owners need one vocabulary.
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
    const isTypeAnnotation = parent.type === typeNode
    const initializer = Option.fromNullishOr(parent.initializer)
    const isNotRuntimeFunction = !Option.exists(initializer, isRuntimeFunctionLike)

    return isTypeAnnotation && isNotRuntimeFunction
  }

  const aliasDeclaration = Option.liftPredicate(ts.isTypeAliasDeclaration)(parent)

  const hasTypeAliasFunctionType = Option.exists(
    aliasDeclaration,
    (alias) => alias.type === typeNode
  )

  const propertySignature = Option.liftPredicate(ts.isPropertySignature)(parent)

  const hasPropertySignatureFunctionType = Option.exists(
    propertySignature,
    (signature) => signature.type === typeNode
  )

  return hasTypeAliasFunctionType || hasPropertySignatureFunctionType
}

const callbackStyleMatches = (context: CheckContext) => {
  const checker = context.checker
  const match = makeDetection(context)

  const matches = (declaration: CallbackStyleDeclaration): ReadonlyArray<Detection> => {
    // Exempt declarations because they mirror a third-party API with no Effect-returning alternative.
    if (isInAmbientContext(declaration)) {
      return Array.empty()
    }

    const declaredSignature = checker.getSignatureFromDeclaration(declaration)
    const signature = Option.fromNullishOr(declaredSignature)

    const isCallback = Option.exists(signature, (resolvedSignature) => {
      const returnType = checker.getReturnTypeOfSignature(resolvedSignature)
      const returnsVoid = isVoidType(returnType)

      const hasFunctionArgument = Array.some(declaration.parameters, (parameter) => {
        const parameterType = checker.getTypeAtLocation(parameter)
        const parameterHasCallSignature = hasCallSignature(checker)(parameterType)
        const restToken = Option.fromNullishOr(parameter.dotDotDotToken)

        if (Option.isNone(restToken)) {
          return parameterHasCallSignature
        }

        const indexType = checker.getIndexTypeOfType(parameterType, ts.IndexKind.Number)
        const elementType = Option.fromNullishOr(indexType)
        const elementHasCallSignature = Option.exists(elementType, hasCallSignature(checker))

        const callSignatureIndicators = Array.make(
          parameterHasCallSignature,
          elementHasCallSignature
        )

        return Array.some(callSignatureIndicators, Boolean)
      })

      return returnsVoid && hasFunctionArgument
    })

    const callbackMatch = match({
      node: declaration,
      message: "Avoid callback-style functions that accept a function argument and return void.",
      hint:
        "Use Effect instead: wrap third-party callback APIs in an Effect, or declare your " +
        "own API as an Effect-returning function from the start. Ambient declarations " +
        "(declare statements) describing a third-party API are permitted."
    })

    return isCallback ? Array.of(callbackMatch) : Array.empty()
  }

  return matches
}

const callbackStyleCandidateKinds = Array.make(
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.MethodSignature,
  ts.SyntaxKind.CallSignature,
  ts.SyntaxKind.FunctionType
)

export const noCallbacks = makeCheck(
  "no-callbacks",
  callbackStyleCandidateKinds,
  isCallbackStyleCandidate,
  callbackStyleMatches
)
