import type { ResultShape } from "../../internal/support/resultShape.js"
import { ResultExpectation } from "./resultExpectation.js"

export const shapeExpectation = (expected: ResultShape) => (label: string) =>
  ResultExpectation.make({
    _tag: "shape",
    expected,
    label
  })
