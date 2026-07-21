import { Array, Function, Option, pipe, Result } from "effect"
import * as ts from "typescript"
import { InterfaceBurdenData } from "./architectureExploreData.js"
import { toWorkspacePath } from "./architectureExplore/paths.js"
import { functionInitializer, hasExportModifier } from "../support/tsNode.js"
import { toRelativeFileName } from "../support/paths.js"
import { fileMatcher } from "@better-typescript/matchers/matcher"
import { nodeMatch, type Match, type MatchContext } from "@better-typescript/matchers/matcher/data"

const minimumOperations = 4

const emptySurface = InterfaceBurdenData.make({
  operationCount: 0,
  requiredParameterCount: 0
})

const requiredParameters = (parameters: ts.NodeArray<ts.ParameterDeclaration>) =>
  Array.countBy(parameters, (parameter) => {
    const optional = Option.fromNullishOr(parameter.questionToken)
    const defaulted = Option.fromNullishOr(parameter.initializer)
    const rest = Option.fromNullishOr(parameter.dotDotDotToken)
    const optionalMissing = Option.isNone(optional)
    const defaultMissing = Option.isNone(defaulted)
    const restMissing = Option.isNone(rest)
    const omissions = Array.make(optionalMissing, defaultMissing, restMissing)

    return Array.every(omissions, Boolean)
  })

const callableSurface = (
  node:
    | ts.ArrowFunction
    | ts.FunctionExpression
    | ts.FunctionDeclaration
    | ts.MethodDeclaration
    | ts.GetAccessorDeclaration
    | ts.SetAccessorDeclaration
    | ts.ConstructorDeclaration
) => {
  const requiredParameterCount = requiredParameters(node.parameters)

  return InterfaceBurdenData.make({
    operationCount: 1,
    requiredParameterCount
  })
}

const combineSurface = (left: InterfaceBurdenData, right: InterfaceBurdenData) =>
  InterfaceBurdenData.make({
    operationCount: left.operationCount + right.operationCount,
    requiredParameterCount: left.requiredParameterCount + right.requiredParameterCount
  })

const isPublicClassMember = (member: ts.ClassElement) => {
  const modifiers = pipe(
    Option.liftPredicate(ts.canHaveModifiers)(member),
    Option.map(ts.getModifiers),
    Option.flatMap(Option.fromNullishOr),
    Option.getOrElse(Array.empty)
  )

  const hiddenKinds = Array.make(ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword)
  const isHiddenModifier = (modifier: ts.Modifier) => Array.contains(hiddenKinds, modifier.kind)

  return !Array.some(modifiers, isHiddenModifier)
}

// CallableClassMember is the callable class-node protocol because guard and calculator agree.
export type CallableClassMember =
  | ts.MethodDeclaration
  | ts.GetAccessorDeclaration
  | ts.SetAccessorDeclaration
  | ts.ConstructorDeclaration

const callableClassMemberKinds: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
  ts.SyntaxKind.Constructor
)

const isCallableClassMember = (member: ts.ClassElement): member is CallableClassMember =>
  Array.contains(callableClassMemberKinds, member.kind)

const classSurface = (declaration: ts.ClassDeclaration) => {
  const publicMembers = Array.filter(declaration.members, isPublicClassMember)

  const memberSurfaces = pipe(
    publicMembers,
    Array.filter(isCallableClassMember),
    Array.map(callableSurface)
  )

  const hasConstructor = Array.some(publicMembers, ts.isConstructorDeclaration)

  const constructorSurface = hasConstructor
    ? emptySurface
    : InterfaceBurdenData.make({
        operationCount: 1,
        requiredParameterCount: 0
      })

  return Array.reduce(memberSurfaces, constructorSurface, combineSurface)
}

const isFunctionInitializer = (
  initializer: ts.Expression
): initializer is ts.ArrowFunction | ts.FunctionExpression =>
  ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)

const surfaceFromProperty = (property: ts.PropertyAssignment) =>
  pipe(
    Option.some(property.initializer),
    Option.filter(isFunctionInitializer),
    Option.map(callableSurface)
  )

const surfaceFromMember = (member: ts.ObjectLiteralElementLike) => {
  const methodSurface = pipe(
    Option.liftPredicate(ts.isMethodDeclaration)(member),
    Option.map(callableSurface)
  )

  const propertySurface = pipe(
    Option.liftPredicate(ts.isPropertyAssignment)(member),
    Option.flatMap(surfaceFromProperty)
  )

  return pipe(
    methodSurface,
    Option.orElse(Function.constant(propertySurface)),
    Result.fromOption(Function.constVoid)
  )
}

const objectLiteralSurface = (literal: ts.ObjectLiteralExpression) =>
  pipe(
    literal.properties,
    Array.filterMap(surfaceFromMember),
    Array.reduce(emptySurface, combineSurface)
  )

const variableStatementSurface = (statement: ts.VariableStatement) => {
  if (!hasExportModifier(statement)) {
    return emptySurface
  }

  return pipe(
    statement.declarationList.declarations,
    Array.map((declaration) => {
      const directFunction = pipe(functionInitializer(declaration), Option.map(callableSurface))

      const objectModule = pipe(
        Option.fromNullishOr(declaration.initializer),
        Option.filter(ts.isObjectLiteralExpression),
        Option.map(objectLiteralSurface)
      )

      return pipe(
        directFunction,
        Option.orElse(Function.constant(objectModule)),
        Option.getOrElse(Function.constant(emptySurface))
      )
    }),
    Array.reduce(emptySurface, combineSurface)
  )
}

const statementSurface = (statement: ts.Statement) => {
  const variableSurface = pipe(
    Option.liftPredicate(ts.isVariableStatement)(statement),
    Option.map(variableStatementSurface)
  )

  const functionSurface = pipe(
    Option.liftPredicate(ts.isFunctionDeclaration)(statement),
    Option.filter(hasExportModifier),
    Option.map(callableSurface)
  )

  const exportedClassSurface = pipe(
    Option.liftPredicate(ts.isClassDeclaration)(statement),
    Option.filter(hasExportModifier),
    Option.map(classSurface)
  )

  return pipe(
    variableSurface,
    Option.orElse(Function.constant(functionSurface)),
    Option.orElse(Function.constant(exportedClassSurface)),
    Option.getOrElse(Function.constant(emptySurface))
  )
}

const interfaceBurdenElements = (
  context: MatchContext
): ReadonlyArray<Match<InterfaceBurdenData>> => {
  const statements = context.sourceFile.statements

  const surface = pipe(
    statements,
    Array.map(statementSurface),
    Array.reduce(emptySurface, combineSurface)
  )

  if (surface.operationCount < minimumOperations) {
    return Array.empty()
  }

  const node = pipe(
    Option.fromNullishOr(statements[0]),
    Option.getOrElse(Function.constant(context.sourceFile))
  )

  const relative = toRelativeFileName(context.projectRoot)
  const workspaceRelative = toWorkspacePath(context.projectRoot, context.workspaceRoot)
  const filePath = relative(context.sourceFile.fileName)
  const workspacePath = workspaceRelative(filePath)

  const data = InterfaceBurdenData.make({
    operationCount: surface.operationCount,
    requiredParameterCount: surface.requiredParameterCount,
    workspacePath
  })

  const reported = nodeMatch(node, data)

  return Array.of(reported)
}

const interfaceBurdenCheck = fileMatcher(interfaceBurdenElements)

export const interfaceBurden = interfaceBurdenCheck
