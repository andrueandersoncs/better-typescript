import { flow, Option } from "effect"
import * as ts from "typescript"

export const symbolOptionAt = (checker: ts.TypeChecker) =>
  flow(checker.getSymbolAtLocation, Option.fromNullishOr)
