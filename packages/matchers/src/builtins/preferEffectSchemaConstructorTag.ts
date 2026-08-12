import { Array, Option, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { unwrapTransparentExpression } from "../support/transparentWrapper.js"

const tagPropertyName = "_tag"

const hasTagText = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual(tagPropertyName))

const isTagAssignment = (
  property: ts.ObjectLiteralElementLike
): property is ts.PropertyAssignment =>
  ts.isPropertyAssignment(property) &&
  pipe(Option.liftPredicate(ts.isIdentifier)(property.name), Option.exists(hasTagText))

const tagValueText = (property: ts.PropertyAssignment) =>
  pipe(
    unwrapTransparentExpression(property.initializer),
    Option.liftPredicate(ts.isStringLiteralLike),
    Option.map(Struct.get("text"))
  )

export const schemaConstructorTag = (literal: ts.ObjectLiteralExpression) =>
  pipe(
    Array.findFirst(literal.properties, isTagAssignment),
    Option.flatMap(tagValueText),
    Option.getOrUndefined
  )
