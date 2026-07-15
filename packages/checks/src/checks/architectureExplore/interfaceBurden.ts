import { Array, Function, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { InterfaceBurdenData } from "./data.js"
import { functionInitializer, hasExportModifier } from "../support/tsNode.js"
import { fileCheck, detection } from "@better-typescript/core/engine/check"

const minimumOperations = 4

const message =
  "Interface burden evidence — this Module exposes many callable operations or required parameters."

const hint =
  "Interface size is evidence, not a depth verdict. Architecture Explore combines it with low-leverage forwarding before recommending a smaller, deeper interface."

const emptySurface = new InterfaceBurdenData({
  operationCount: 0,
  requiredParameterCount: 0
})

const requiredParameters = (parameters: ts.NodeArray<ts.ParameterDeclaration>): number =>
  Array.filter(parameters, (parameter) => {
    const optional = Option.fromNullable(parameter.questionToken)
    const defaulted = Option.fromNullable(parameter.initializer)
    const rest = Option.fromNullable(parameter.dotDotDotToken)
    const optionalMissing = Option.isNone(optional)
    const defaultMissing = Option.isNone(defaulted)
    const restMissing = Option.isNone(rest)
    const omissions = Array.make(optionalMissing, defaultMissing, restMissing)

    return Array.every(omissions, Boolean)
  }).length

const callableSurface = (
  node:
    | ts.ArrowFunction
    | ts.FunctionExpression
    | ts.FunctionDeclaration
    | ts.MethodDeclaration
    | ts.GetAccessorDeclaration
    | ts.SetAccessorDeclaration
    | ts.ConstructorDeclaration
): InterfaceBurdenData => {
  const requiredParameterCount = requiredParameters(node.parameters)

  return new InterfaceBurdenData({
    operationCount: 1,
    requiredParameterCount
  })
}

const combineSurface = (
  left: InterfaceBurdenData,
  right: InterfaceBurdenData
): InterfaceBurdenData =>
  new InterfaceBurdenData({
    operationCount: left.operationCount + right.operationCount,
    requiredParameterCount: left.requiredParameterCount + right.requiredParameterCount
  })

const isPublicClassMember = (member: ts.ClassElement): boolean => {
  const modifiers = pipe(
    Option.liftPredicate(ts.canHaveModifiers)(member),
    Option.map(ts.getModifiers),
    Option.flatMap(Option.fromNullable),
    Option.getOrElse(Array.empty)
  )

  const hiddenKinds = Array.make(ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword)

  return !Array.some(modifiers, (modifier) => Array.contains(hiddenKinds, modifier.kind))
}

/**
 * CallableClassMember is the compiler-node protocol accepted by class surface
 * measurement.
 *
 * @remarks
 *   It remains explicit because the type guard and surface calculator must agree
 *   on callable class syntax; removing it would repeat the union and let their
 *   accepted node kinds drift.
 * @modelRole protocol
 */
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

const classSurface = (declaration: ts.ClassDeclaration): InterfaceBurdenData => {
  const publicMembers = Array.filter(declaration.members, isPublicClassMember)

  const memberSurfaces = pipe(
    publicMembers,
    Array.filter(isCallableClassMember),
    Array.map(callableSurface)
  )

  const hasConstructor = Array.some(publicMembers, ts.isConstructorDeclaration)

  const constructorSurface = hasConstructor
    ? emptySurface
    : new InterfaceBurdenData({
        operationCount: 1,
        requiredParameterCount: 0
      })

  return Array.reduce(memberSurfaces, constructorSurface, combineSurface)
}

const objectLiteralSurface = (literal: ts.ObjectLiteralExpression): InterfaceBurdenData =>
  pipe(
    literal.properties,
    Array.filterMap((member) => {
      const methodSurface = pipe(
        Option.liftPredicate(ts.isMethodDeclaration)(member),
        Option.map(callableSurface)
      )

      const propertySurface = pipe(
        Option.liftPredicate(ts.isPropertyAssignment)(member),
        Option.flatMap((property) =>
          pipe(
            Option.some(property.initializer),
            Option.filter(
              (initializer): initializer is ts.ArrowFunction | ts.FunctionExpression =>
                ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)
            ),
            Option.map(callableSurface)
          )
        )
      )

      return pipe(methodSurface, Option.orElse(Function.constant(propertySurface)))
    }),
    Array.reduce(emptySurface, combineSurface)
  )

const variableStatementSurface = (statement: ts.VariableStatement): InterfaceBurdenData => {
  if (!hasExportModifier(statement)) {
    return emptySurface
  }

  return pipe(
    statement.declarationList.declarations,
    Array.map((declaration) => {
      const directFunction = pipe(functionInitializer(declaration), Option.map(callableSurface))

      const objectModule = pipe(
        Option.fromNullable(declaration.initializer),
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

const statementSurface = (statement: ts.Statement): InterfaceBurdenData => {
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

const interfaceBurdenElements = (context: CheckContext): ReadonlyArray<Detection> => {
  const element = detection(context)
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
    Option.fromNullable(statements[0]),
    Option.getOrElse(Function.constant(context.sourceFile))
  )

  const data = surface

  const reported = element({
    node,
    message,
    hint,
    data
  })

  return Array.of(reported)
}

export const interfaceBurden: Check = fileCheck(interfaceBurdenElements)
