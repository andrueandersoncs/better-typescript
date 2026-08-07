import { Array, Schema } from "effect"

const undefinedUsageKinds = Array.make<
  ["parameter", "return-type", "return-expression", "type-declaration", "comparison"]
>("parameter", "return-type", "return-expression", "type-declaration", "comparison")

// UndefinedUsageKind classifies undefined sites because usage advice differs.
export const UndefinedUsageKind = Schema.Literals(undefinedUsageKinds)

export type UndefinedUsageKind = typeof UndefinedUsageKind.Type
