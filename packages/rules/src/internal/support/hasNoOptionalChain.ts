import { Option, Struct, flow } from "effect"
import type * as ts from "typescript"

export const hasNoOptionalChain = flow(
  Struct.get<ts.PropertyAccessExpression, "questionDotToken">("questionDotToken"),
  Option.fromNullishOr,
  Option.isNone
)
