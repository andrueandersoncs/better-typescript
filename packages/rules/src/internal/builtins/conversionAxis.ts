import { Array, Schema } from "effect"

const conversionAxes = Array.make<["result", "source"]>("result", "source")

// ConversionAxis exists because its fields form one stable data contract used by the linter.
export const ConversionAxis = Schema.Literals(conversionAxes)

export type ConversionAxis = typeof ConversionAxis.Type
