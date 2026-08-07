import { Option, pipe } from "effect"
import type * as ts from "typescript"

export const contextualType = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
  pipe(checker.getContextualType(expression), Option.fromNullishOr)
