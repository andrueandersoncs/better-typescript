import * as path from "node:path"
import { Chunk, Effect, Stream } from "effect"
import * as ts from "typescript"
import { nodeStream } from "./traverse.js"
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

export const noCallbacks: Rule = {
  id: ruleId,
  description: "Disallow callback-style functions returning void in favor of Effect.",
  check: (context) =>
    Effect.runSync(
      nodeStream(context.sourceFile).pipe(
        Stream.filter(isCallbackStyleCandidate),
        Stream.filter((declaration) => isCallbackStyleDeclaration(context, declaration)),
        Stream.map((declaration) => createMatch(context, declaration)),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}

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

const isCallableValueType = (node: ts.FunctionTypeNode): boolean => {
  const { typeNode, parent } = transparentCallableType(node, node.parent)

  if (ts.isVariableDeclaration(parent)) {
    const isTypeAnnotation = parent.type === typeNode

    return isTypeAnnotation && isCallableTypeAnnotation(parent.initializer)
  }

  if (ts.isPropertyDeclaration(parent)) {
    const isTypeAnnotation = parent.type === typeNode

    return isTypeAnnotation && isCallableTypeAnnotation(parent.initializer)
  }

  const hasTypeAliasFunctionType = isTypeAliasFunctionType(parent, typeNode)
  const hasPropertySignatureFunctionType = isPropertySignatureFunctionType(parent, typeNode)

  return hasTypeAliasFunctionType || hasPropertySignatureFunctionType
}

const isTypeAliasFunctionType = (parent: ts.Node, typeNode: ts.TypeNode): boolean => {
  if (ts.isTypeAliasDeclaration(parent)) {
    return parent.type === typeNode
  }

  return false
}

const isPropertySignatureFunctionType = (
  parent: ts.Node,
  typeNode: ts.TypeNode
): boolean => {
  if (ts.isPropertySignature(parent)) {
    return parent.type === typeNode
  }

  return false
}

const transparentCallableType = (
  typeNode: ts.TypeNode,
  parent: ts.Node
): { readonly typeNode: ts.TypeNode; readonly parent: ts.Node } =>
  isTransparentTypeNode(parent)
    ? transparentCallableType(parent, parent.parent)
    : { typeNode, parent }

const isCallableTypeAnnotation = (initializer: ts.Expression | undefined): boolean => {
  if (initializer !== undefined) {
    return !isRuntimeFunctionLike(initializer)
  }

  return true
}

const transparentTypeNodeKinds = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.ParenthesizedType,
  ts.SyntaxKind.UnionType,
  ts.SyntaxKind.IntersectionType
])

const isTransparentTypeNode = (node: ts.Node): node is ts.TypeNode =>
  transparentTypeNodeKinds.has(node.kind)

const isRuntimeFunctionLike = (node: ts.Expression): boolean =>
  ts.isFunctionExpression(node) || ts.isArrowFunction(node)

const isCallbackStyleDeclaration = (
  context: RuleContext,
  declaration: CallbackStyleDeclaration
): boolean => {
  const signature = context.checker.getSignatureFromDeclaration(declaration)

  if (signature !== undefined) {
    const returnsVoid = isVoidType(context.checker.getReturnTypeOfSignature(signature))
    const hasFunctionArgument = declaration.parameters.some((parameter) =>
      isFunctionArgument(context.checker, parameter)
    )

    return returnsVoid && hasFunctionArgument
  }

  return false
}

const isVoidType = (type: ts.Type): boolean => (type.flags & ts.TypeFlags.Void) !== 0

const isFunctionArgument = (
  checker: ts.TypeChecker,
  parameter: ts.ParameterDeclaration
): boolean => {
  const parameterType = checker.getTypeAtLocation(parameter)
  const parameterHasCallSignature = hasCallSignature(checker, parameterType)

  if (parameter.dotDotDotToken === undefined) {
    return parameterHasCallSignature
  }

  const elementType = checker.getIndexTypeOfType(parameterType, ts.IndexKind.Number)

  if (elementType !== undefined) {
    return parameterHasCallSignature || hasCallSignature(checker, elementType)
  }

  return parameterHasCallSignature
}

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
    return (
      hasDirectCallSignature ||
      type.types.some((part) => hasCallSignature(checker, part, nextSeen))
    )
  }

  const apparentType = checker.getApparentType(type)
  const constraintHasCallSignature = hasConstraintCallSignature(checker, type, nextSeen)
  const apparentTypeHasCallSignature = hasApparentTypeCallSignature(
    checker,
    type,
    apparentType,
    nextSeen
  )

  const hasIndirectCallSignature =
    constraintHasCallSignature || apparentTypeHasCallSignature

  return hasDirectCallSignature || hasIndirectCallSignature
}

const hasApparentTypeCallSignature = (
  checker: ts.TypeChecker,
  type: ts.Type,
  apparentType: ts.Type,
  seen: ReadonlySet<ts.Type>
): boolean => {
  if (apparentType !== type) {
    return hasCallSignature(checker, apparentType, seen)
  }

  return false
}

const hasConstraintCallSignature = (
  checker: ts.TypeChecker,
  type: ts.Type,
  seen: ReadonlySet<ts.Type>
): boolean => {
  const constraint = checker.getBaseConstraintOfType(type)

  if (constraint !== undefined) {
    return hasDifferentConstraintCallSignature(checker, type, constraint, seen)
  }

  return false
}

const hasDifferentConstraintCallSignature = (
  checker: ts.TypeChecker,
  type: ts.Type,
  constraint: ts.Type,
  seen: ReadonlySet<ts.Type>
): boolean => {
  if (constraint !== type) {
    return hasCallSignature(checker, constraint, seen)
  }

  return false
}

const createMatch = (
  context: RuleContext,
  declaration: CallbackStyleDeclaration
): RuleMatch => {
  const sourceFile = context.sourceFile
  const start = declaration.getStart(sourceFile)
  const location = sourceFile.getLineAndCharacterOfPosition(start)

  return {
    ruleId,
    fileName: toRelativeFileName(context.projectRoot, sourceFile.fileName),
    line: location.line + 1,
    column: location.character + 1,
    message: "Avoid callback-style functions that accept a function argument and return void.",
    hint:
      "Use Effect instead: wrap third-party callback APIs in an Effect, or declare your own API " +
      "as an Effect-returning function from the start."
  }
}

const toRelativeFileName = (projectRoot: string, fileName: string): string => {
  const relative = path.relative(projectRoot, fileName)

  if (relative.length === 0) {
    return fileName
  }

  return relative
}
