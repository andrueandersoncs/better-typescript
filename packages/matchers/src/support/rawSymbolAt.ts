import { Option, pipe } from "effect"
import type * as ts from "typescript"

export const rawSymbolAt = (checker: ts.TypeChecker) => (node: ts.Node) =>
  pipe(checker.getSymbolAtLocation(node), Option.fromNullishOr)
