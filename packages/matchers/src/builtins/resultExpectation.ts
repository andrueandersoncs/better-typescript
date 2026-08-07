import { Array, Schema } from "effect"
import { CardinalityResultExpectation } from "./cardinalityResultExpectation.js"
import { ShapeResultExpectation } from "./shapeResultExpectation.js"

const resultExpectationMembers = Array.make(ShapeResultExpectation, CardinalityResultExpectation)

// ResultExpectation unions shape and cardinality because operation advice differs by axis.
export const ResultExpectation = Schema.Union(resultExpectationMembers)

export type ResultExpectation = Schema.Schema.Type<typeof ResultExpectation>
