import { Array, Function, Option, Result, pipe } from "effect"
import * as ts from "typescript"
import { toWorkspacePath } from "./architectureExplore/toWorkspacePath.js"
import { functionInitializer } from "../support/functionInitializer2.js"
import { hasExportModifier } from "../support/hasExportModifier.js"
import { toRelativeFileName } from "../support/paths.js"
import { fileMatcher } from "../matcher/fileMatcher.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import type { Match } from "../matcher/match.js"
import type { MatchContext } from "../matcher/matchContext.js"
import { InterfaceBurdenData } from "./interfaceBurdenData.js"
import { emptySurface } from "./emptySurface.js"
import { callableSurface } from "./callableSurface.js"
import { combineSurface } from "./combineSurface.js"

const minimumOperations = 4

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
  const surface = pipe(
    context.sourceFile.statements,
    Array.map(statementSurface),
    Array.reduce(emptySurface, combineSurface)
  )

  if (surface.operationCount < minimumOperations) {
    return Array.empty()
  }

  const node = pipe(
    Option.fromNullishOr(context.sourceFile.statements[0]),
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

  const reported = makeNodeMatch(node, data)

  return Array.of(reported)
}

export const interfaceBurden = fileMatcher(interfaceBurdenElements)
