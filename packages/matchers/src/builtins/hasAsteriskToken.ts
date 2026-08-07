import { Option, pipe } from "effect"
import type * as ts from "typescript"

export const hasAsteriskToken = (node: ts.FunctionExpression | ts.YieldExpression) =>
  pipe(node.asteriskToken, Option.fromNullishOr, Option.isSome)
