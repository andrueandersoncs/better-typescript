import { Array, Schema } from "effect"

const conversionAxes = Array.make<["result", "source"]>("result", "source")

// ConversionAxis classifies conversion direction because axis advice differs.
export const ConversionAxis = Schema.Literals(conversionAxes)

export type ConversionAxis = typeof ConversionAxis.Type
