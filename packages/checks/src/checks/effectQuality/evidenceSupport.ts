import { Array, Function, HashSet, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { ArchitectureRole } from "../support/architectureRole.js"
import {
  enclosingFunctionLike,
  importedEffectApiAt,
  importedEffectApiSubject
} from "../functionalCoreEffect/support.js"
import { propertyNameText, unwrapTransparentExpression } from "../support/tsNode.js"
import { declarationNameText } from "./astQueries.js"

export const apiSubject =
  (context: CheckContext) => (fallback: string) => (expression: ts.Expression) =>
    pipe(
      importedEffectApiSubject(context.checker, expression),
      Option.getOrElse(Function.constant(fallback))
    )

export const enclosingFunctionName = (node: ts.Node) =>
  pipe(
    enclosingFunctionLike(node),
    Option.flatMap((declaration) => {
      const direct = declarationNameText(declaration)

      if (Option.isSome(direct)) {
        return direct
      }

      return pipe(
        Option.fromNullishOr(declaration.parent),
        Option.flatMap((parent) => {
          const variableName = pipe(
            Option.some(parent),
            Option.filter(ts.isVariableDeclaration),
            Option.map(Struct.get("name")),
            Option.filter(ts.isIdentifier),
            Option.map(Struct.get("text"))
          )

          if (Option.isSome(variableName)) {
            return variableName
          }

          return pipe(
            Option.some(parent),
            Option.filter(ts.isPropertyAssignment),
            Option.map(Struct.get("name")),
            Option.flatMap(propertyNameText)
          )
        })
      )
    })
  )

export const backoffScheduleNames = Array.make("exponential", "fibonacci")

export const retryEffectNames = Array.make("retry", "retryOrElse")

export const cacheMakeNames = Array.make("make", "makeWith")

export const productionRoles = HashSet.make(
  "domain" as ArchitectureRole,
  "port" as ArchitectureRole,
  "application" as ArchitectureRole,
  "adapter" as ArchitectureRole,
  "root" as ArchitectureRole
)

export const isProductionRole = (role: ArchitectureRole) => HashSet.has(productionRoles, role)

export const callIsEffectApi =
  (checker: ts.TypeChecker) =>
  (namespace: string) =>
  (names: ReadonlyArray<string>) =>
  (node: ts.CallExpression) =>
    importedEffectApiAt(checker, node.expression, namespace, names)

const assignmentBindingName = (parent: ts.BinaryExpression) => {
  const isEquals = parent.operatorToken.kind === ts.SyntaxKind.EqualsToken

  if (!isEquals) {
    return Option.none<string>()
  }

  const left = unwrapTransparentExpression(parent.left)
  const isIdentifier = ts.isIdentifier(left)

  return isIdentifier ? Option.some(left.text) : Option.none()
}

export const newMapBindingName = (node: ts.NewExpression) => {
  const expression = unwrapTransparentExpression(node.expression)
  const identifierMap = ts.isIdentifier(expression)
  const identifierText = identifierMap ? expression.text : ""
  const identifierIsMap = identifierText === "Map"
  const propertyMap = ts.isPropertyAccessExpression(expression)
  const propertyText = propertyMap ? expression.name.text : ""
  const propertyIsMap = propertyText === "Map"
  const mapIdentifier = Array.make(identifierMap, identifierIsMap)
  const mapProperty = Array.make(propertyMap, propertyIsMap)
  const isIdentifierMap = Array.every(mapIdentifier, Boolean)
  const isPropertyMap = Array.every(mapProperty, Boolean)
  const isMap = Array.make(isIdentifierMap, isPropertyMap)

  if (!Array.some(isMap, Boolean)) {
    return Option.none()
  }

  return pipe(
    Option.fromNullishOr(node.parent),
    Option.flatMap((parent) => {
      const variableName = pipe(
        Option.some(parent),
        Option.filter(ts.isVariableDeclaration),
        Option.map(Struct.get("name")),
        Option.filter(ts.isIdentifier),
        Option.map(Struct.get("text"))
      )

      if (Option.isSome(variableName)) {
        return variableName
      }

      if (ts.isBinaryExpression(parent)) {
        return assignmentBindingName(parent)
      }

      return pipe(
        Option.some(parent),
        Option.filter(ts.isPropertyAssignment),
        Option.map(Struct.get("name")),
        Option.flatMap(propertyNameText)
      )
    })
  )
}
