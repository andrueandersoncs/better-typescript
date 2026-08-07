import { Schema } from "effect"

const shapeExpectationKind = Schema.Literal("shape")

// ShapeResultExpectation is shape advice because operation names imply a result shape.
export const ShapeResultExpectation = Schema.Struct({
  _tag: shapeExpectationKind,
  expected: Schema.String,
  label: Schema.String
})

export interface ShapeResultExpectation extends Schema.Schema.Type<typeof ShapeResultExpectation> {}
