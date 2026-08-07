import { Schema } from "effect"
import { refactorExampleSourceSchema } from "../example/refactorExampleSourceSchema.js"

// optionalExamples is the examples key because silent and reported policies share shape.
export const optionalExamples = Schema.optionalKey(refactorExampleSourceSchema)
