import { Array, Option, Struct, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "@better-typescript/matchers/equivalence"

import { propertyNameText } from "../../support/propertyNameText.js"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"

const assignmentBindingName = (parent: ts.BinaryExpression) => {
  const isEquals = strictEqual(ts.SyntaxKind.EqualsToken)(parent.operatorToken.kind)

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
  const identifierIsMap = strictEqual("Map")(identifierText)
  const propertyMap = ts.isPropertyAccessExpression(expression)
  const propertyText = propertyMap ? expression.name.text : ""
  const propertyIsMap = strictEqual("Map")(propertyText)
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
