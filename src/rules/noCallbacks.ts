import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { differentApparentType, differentBaseConstraint } from "./tsType.js"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-callbacks"

type CallbackStyleDeclaration =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration
  | ts.MethodSignature
  | ts.CallSignatureDeclaration
  | ts.FunctionTypeNode

const isCallbackStyleCandidate = (node: ts.Node): node is CallbackStyleDeclaration =>
  [
    ts.isFunctionDeclaration(node),
    ts.isFunctionExpression(node),
    ts.isArrowFunction(node),
    ts.isMethodDeclaration(node),
    ts.isMethodSignature(node),
    ts.isCallSignatureDeclaration(node),
    ts.isFunctionTypeNode(node) ? isCallableValueType(node) : false
  ].some(Boolean)

const transparentTypeNodeKinds = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.ParenthesizedType,
  ts.SyntaxKind.UnionType,
  ts.SyntaxKind.IntersectionType
])

const isTransparentTypeNode = (node: ts.Node): node is ts.TypeNode =>
  transparentTypeNodeKinds.has(node.kind)

const transparentCallableType = (
  typeNode: ts.TypeNode,
  parent: ts.Node
): { readonly typeNode: ts.TypeNode; readonly parent: ts.Node } =>
  isTransparentTypeNode(parent)
    ? transparentCallableType(parent, parent.parent)
    : { typeNode, parent }

const isRuntimeFunctionLike = (node: ts.Expression): boolean =>
  ts.isFunctionExpression(node) || ts.isArrowFunction(node)

const isCallableTypeAnnotation = (initializer: Option.Option<ts.Expression>): boolean =>
  !Option.exists(initializer, isRuntimeFunctionLike)

const isTypeOfAlias =
  (typeNode: ts.TypeNode) =>
  (parent: ts.TypeAliasDeclaration): boolean =>
    parent.type === typeNode

const isTypeAliasFunctionType = (parent: ts.Node, typeNode: ts.TypeNode): boolean =>
  Option.exists(Option.liftPredicate(ts.isTypeAliasDeclaration)(parent), isTypeOfAlias(typeNode))

const isTypeOfPropertySignature =
  (typeNode: ts.TypeNode) =>
  (parent: ts.PropertySignature): boolean =>
    parent.type === typeNode

const isPropertySignatureFunctionType = (parent: ts.Node, typeNode: ts.TypeNode): boolean =>
  Option.exists(
    Option.liftPredicate(ts.isPropertySignature)(parent),
    isTypeOfPropertySignature(typeNode)
  )

const isCallableValueType = (node: ts.FunctionTypeNode): boolean => {
  const { typeNode, parent } = transparentCallableType(node, node.parent)
  const isValueDeclaration = ts.isVariableDeclaration(parent) || ts.isPropertyDeclaration(parent)

  if (isValueDeclaration) {
    const isTypeAnnotation = parent.type === typeNode

    return isTypeAnnotation && isCallableTypeAnnotation(Option.fromNullable(parent.initializer))
  }

  const hasTypeAliasFunctionType = isTypeAliasFunctionType(parent, typeNode)
  const hasPropertySignatureFunctionType = isPropertySignatureFunctionType(parent, typeNode)

  return hasTypeAliasFunctionType || hasPropertySignatureFunctionType
}

const isVoidType = (type: ts.Type): boolean => (type.flags & ts.TypeFlags.Void) !== 0

const callSignatureCheck =
  (checker: ts.TypeChecker, seen: ReadonlySet<ts.Type> = new Set()) =>
  (type: ts.Type): boolean =>
    hasCallSignature(checker, type, seen)

const hasCallSignature = (
  checker: ts.TypeChecker,
  type: ts.Type,
  seen: ReadonlySet<ts.Type> = new Set()
): boolean => {
  const isUnseen = !seen.has(type)

  return isUnseen && hasUnseenCallSignature(checker, type, seen)
}

const hasUnseenCallSignature = (
  checker: ts.TypeChecker,
  type: ts.Type,
  seen: ReadonlySet<ts.Type>
): boolean => {
  const nextSeen = new Set(seen).add(type)
  const hasDirectCallSignature = type.getCallSignatures().length > 0

  if (type.isUnionOrIntersection()) {
    return hasDirectCallSignature || type.types.some(callSignatureCheck(checker, nextSeen))
  }

  const constraintHasCallSignature = Option.exists(
    differentBaseConstraint(checker, type),
    callSignatureCheck(checker, nextSeen)
  )
  const apparentTypeHasCallSignature = Option.exists(
    differentApparentType(checker, type),
    callSignatureCheck(checker, nextSeen)
  )

  const hasIndirectCallSignature = constraintHasCallSignature || apparentTypeHasCallSignature

  return hasDirectCallSignature || hasIndirectCallSignature
}

const isFunctionArgument =
  (checker: ts.TypeChecker) =>
  (parameter: ts.ParameterDeclaration): boolean => {
    const parameterType = checker.getTypeAtLocation(parameter)
    const parameterHasCallSignature = hasCallSignature(checker, parameterType)
    const restToken = Option.fromNullable(parameter.dotDotDotToken)

    if (Option.isNone(restToken)) {
      return parameterHasCallSignature
    }

    const elementType = Option.fromNullable(
      checker.getIndexTypeOfType(parameterType, ts.IndexKind.Number)
    )
    const elementHasCallSignature = Option.exists(elementType, callSignatureCheck(checker))

    return [parameterHasCallSignature, elementHasCallSignature].some(Boolean)
  }

const isCallbackSignature =
  (context: RuleContext, declaration: CallbackStyleDeclaration) =>
  (signature: ts.Signature): boolean => {
    const returnsVoid = isVoidType(context.checker.getReturnTypeOfSignature(signature))
    const hasFunctionArgument = declaration.parameters.some(isFunctionArgument(context.checker))

    return returnsVoid && hasFunctionArgument
  }

const isCallbackStyleDeclaration = (
  context: RuleContext,
  declaration: CallbackStyleDeclaration
): boolean =>
  Option.exists(
    Option.fromNullable(context.checker.getSignatureFromDeclaration(declaration)),
    isCallbackSignature(context, declaration)
  )

const callbackStyleMatches = (
  declaration: CallbackStyleDeclaration,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  isCallbackStyleDeclaration(context, declaration)
    ? [
        createRuleMatch(context, {
          ruleId,
          node: declaration,
          message:
            "Avoid callback-style functions that accept a function argument and return void.",
          hint:
            "Use Effect instead: wrap third-party callback APIs in an Effect, or declare your " +
            "own API as an Effect-returning function from the start."
        })
      ]
    : []

export const noCallbacks: Rule = {
  id: ruleId,
  description: "Disallow callback-style functions returning void in favor of Effect.",
  check: onNode(
    [
      ts.SyntaxKind.FunctionDeclaration,
      ts.SyntaxKind.FunctionExpression,
      ts.SyntaxKind.ArrowFunction,
      ts.SyntaxKind.MethodDeclaration,
      ts.SyntaxKind.MethodSignature,
      ts.SyntaxKind.CallSignature,
      ts.SyntaxKind.FunctionType
    ],
    isCallbackStyleCandidate,
    callbackStyleMatches
  )
}
