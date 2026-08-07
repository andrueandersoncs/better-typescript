import { flow, Option } from "effect"

import * as ts from "typescript"

import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"

export const objectLiteralArgument = flow(
  unwrapTransparentExpression,
  Option.liftPredicate(ts.isObjectLiteralExpression)
)
