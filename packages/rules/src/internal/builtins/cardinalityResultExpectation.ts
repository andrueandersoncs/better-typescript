import { Schema } from "effect"

const cardinalityExpectationKind = Schema.Literal("cardinality")

// CardinalityResultExpectation exists because its fields form one stable data contract used by the linter.
export const CardinalityResultExpectation = Schema.Struct({
  _tag: cardinalityExpectationKind,
  expected: Schema.String,
  label: Schema.String
})

export interface CardinalityResultExpectation extends Schema.Schema.Type<
  typeof CardinalityResultExpectation
> {}
