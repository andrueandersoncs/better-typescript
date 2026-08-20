import { Array, Schema } from "effect"

const undefinedUsageKinds = Array.make<
  ["parameter", "return-type", "return-expression", "type-declaration", "comparison"]
>("parameter", "return-type", "return-expression", "type-declaration", "comparison")

// UndefinedUsageKind exists because its fields form one stable data contract used by the linter.
export const UndefinedUsageKind = Schema.Literals(undefinedUsageKinds)

export type UndefinedUsageKind = typeof UndefinedUsageKind.Type
