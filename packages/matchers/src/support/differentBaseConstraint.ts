import * as ts from "typescript"
import { isDifferentType } from "./isDifferentType.js"
import { pipe, Option } from "effect"

export const differentBaseConstraint = (checker: ts.TypeChecker) => (type: ts.Type) =>
  pipe(
    checker.getBaseConstraintOfType(type),
    Option.fromNullishOr,
    Option.filter(isDifferentType(type))
  )
