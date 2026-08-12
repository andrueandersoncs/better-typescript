import { Array, Option, Schema, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import { unwrapTransparentExpression } from "../support/transparentWrapper.js"

const optionalTag = Schema.optional(Schema.String)

// PreferEffectSchemaConstructorFact records optional tags because tagged advice differs.
export const PreferEffectSchemaConstructorFact = Schema.Struct({
  tag: optionalTag
})

export interface PreferEffectSchemaConstructorFact extends Schema.Schema.Type<
  typeof PreferEffectSchemaConstructorFact
> {}

const tagPropertyName = "_tag"
const hasTagText = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual(tagPropertyName))

const isTagAssignment = (
  property: ts.ObjectLiteralElementLike
): property is ts.PropertyAssignment =>
  pipe(
    Option.liftPredicate(ts.isPropertyAssignment)(property),
    Option.map(Struct.get("name")),
    Option.filter(ts.isIdentifier),
    Option.exists(hasTagText)
  )

const tagValueText = (property: ts.PropertyAssignment) =>
  pipe(
    unwrapTransparentExpression(property.initializer),
    Option.liftPredicate(ts.isStringLiteralLike),
    Option.map(Struct.get("text"))
  )

const schemaConstructorTag = (literal: ts.ObjectLiteralExpression) =>
  pipe(
    Array.findFirst(literal.properties, isTagAssignment),
    Option.flatMap(tagValueText),
    Option.getOrUndefined
  )

export const makePreferEffectSchemaConstructorMatch = (literal: ts.ObjectLiteralExpression) => {
  const tag = schemaConstructorTag(literal)
  const fact = PreferEffectSchemaConstructorFact.make({ tag })

  return makeNodeMatch(literal, fact)
}
