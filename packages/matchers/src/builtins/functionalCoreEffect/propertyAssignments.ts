import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import { propertyNameText } from "../../support/tsNode.js"

export const propertyAssignmentNamed = (
  object: ts.ObjectLiteralExpression,
  names: ReadonlyArray<string>
) => {
  const nameIsListed = (name: string) => Array.contains(names, name)

  const isPropertyAssignmentOf = (property: ts.ObjectLiteralElementLike) =>
    ts.isPropertyAssignment(property) &&
    pipe(propertyNameText(property.name), Option.exists(nameIsListed))

  return Array.findFirst(object.properties, isPropertyAssignmentOf)
}
