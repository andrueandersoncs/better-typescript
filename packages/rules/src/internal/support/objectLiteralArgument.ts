import { Option, flow } from "effect"
import * as ts from "typescript"
import { unwrapTransparentExpression } from "./transparentWrapper.js"

export const objectLiteralArgument = flow(
  unwrapTransparentExpression,
  Option.liftPredicate(ts.isObjectLiteralExpression)
)
