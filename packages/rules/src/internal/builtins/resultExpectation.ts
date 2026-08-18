import { Array, Schema } from "effect"
import { CardinalityResultExpectation } from "./cardinalityResultExpectation.js"
import { ShapeResultExpectation } from "./shapeResultExpectation.js"

const resultExpectationMembers = Array.make(ShapeResultExpectation, CardinalityResultExpectation)

// ResultExpectation exists because its fields form one stable data contract used by the linter.
export const ResultExpectation = Schema.Union(resultExpectationMembers)

export type ResultExpectation = Schema.Schema.Type<typeof ResultExpectation>
