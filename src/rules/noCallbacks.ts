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
  ts.isFunctionDeclaration(node) ||
  ts.isFunctionExpression(node) ||
  ts.isArrowFunction(node) ||
  ts.isMethodDeclaration(node) ||
  ts.isMethodSignature(node) ||
  ts.isCallSignatureDeclaration(node) ||
  (ts.isFunctionTypeNode(node) && isCallableValueType(node))

const isCallableValueType = (node: ts.FunctionTypeNode): boolean => {
  let typeNode: ts.TypeNode = node
  let parent = node.parent

  while (isTransparentTypeNode(parent)) {
    typeNode = parent
    parent = parent.parent
  }

  if (ts.isTypeAliasDeclaration(parent) && parent.type === typeNode) {
    return true
  }

  if (ts.isPropertySignature(parent) && parent.type === typeNode) {
    return true
  }

  if (ts.isVariableDeclaration(parent) && parent.type === typeNode) {
    return parent.initializer === undefined || !isRuntimeFunctionLike(parent.initializer)
  }

  if (ts.isPropertyDeclaration(parent) && parent.type === typeNode) {
    return parent.initializer === undefined || !isRuntimeFunctionLike(parent.initializer)
  }

  return false
}

const isTransparentTypeNode = (node: ts.Node): node is ts.TypeNode =>
  ts.isParenthesizedTypeNode(node) ||
  ts.isUnionTypeNode(node) ||
  ts.isIntersectionTypeNode(node)

const isRuntimeFunctionLike = (node: ts.Expression): boolean =>
  ts.isFunctionExpression(node) || ts.isArrowFunction(node)

const isCallbackStyleDeclaration = (
  context: RuleContext,
  declaration: CallbackStyleDeclaration
): boolean => {
  const signature = context.checker.getSignatureFromDeclaration(declaration)

  if (signature === undefined) {
    return false
  }

  return (
    isVoidType(context.checker.getReturnTypeOfSignature(signature)) &&
    declaration.parameters.some((parameter) => isFunctionArgument(context.checker, parameter))
  )
}

const isVoidType = (type: ts.Type): boolean => (type.flags & ts.TypeFlags.Void) !== 0

const isFunctionArgument = (
  checker: ts.TypeChecker,
  parameter: ts.ParameterDeclaration
): boolean => {
  const parameterType = checker.getTypeAtLocation(parameter)

  if (hasCallSignature(checker, parameterType)) {
    return true
  }

  if (parameter.dotDotDotToken === undefined) {
    return false
  }

  const elementType = checker.getIndexTypeOfType(parameterType, ts.IndexKind.Number)
  return elementType !== undefined && hasCallSignature(checker, elementType)
}

const hasCallSignature = (
  checker: ts.TypeChecker,
  type: ts.Type,
  seen: ReadonlySet<ts.Type> = new Set()
): boolean => {
  if (seen.has(type)) {
    return false
  }

  const nextSeen = new Set(seen).add(type)

  if (type.getCallSignatures().length > 0) {
    return true
  }

  if (type.isUnionOrIntersection()) {
    return type.types.some((part) => hasCallSignature(checker, part, nextSeen))
  }

  const constraint = checker.getBaseConstraintOfType(type)

  if (
    constraint !== undefined &&
    constraint !== type &&
    hasCallSignature(checker, constraint, nextSeen)
  ) {
    return true
  }

  const apparentType = checker.getApparentType(type)
  return apparentType !== type && hasCallSignature(checker, apparentType, nextSeen)
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
  return relative.length === 0 ? fileName : relative
}
