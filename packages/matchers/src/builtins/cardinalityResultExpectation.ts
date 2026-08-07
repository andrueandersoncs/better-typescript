import { Schema } from "effect"

const cardinalityExpectationKind = Schema.Literal("cardinality")

// CardinalityResultExpectation is cardinality advice because operation names imply cardinality.
export const CardinalityResultExpectation = Schema.Struct({
  _tag: cardinalityExpectationKind,
  expected: Schema.String,
  label: Schema.String
})

export interface CardinalityResultExpectation extends Schema.Schema.Type<
  typeof CardinalityResultExpectation
> {}
