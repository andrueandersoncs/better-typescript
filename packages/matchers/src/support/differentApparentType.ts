import * as ts from "typescript"
import { isDifferentType } from "./isDifferentType.js"
import { pipe, Option } from "effect"

export const differentApparentType = (checker: ts.TypeChecker) => (type: ts.Type) =>
  pipe(checker.getApparentType(type), Option.liftPredicate(isDifferentType(type)))
