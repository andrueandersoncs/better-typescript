import { Option, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { foldAst } from "../sources/foldAst.js"
import { symbolOptionAt } from "./symbolOptionAt.js"

export const referencesToSymbol = (checker: ts.TypeChecker, symbol: ts.Symbol, root: ts.Node) => {
  const symbolAt = symbolOptionAt(checker)

  const countMatchingIdentifier = (count: number, node: ts.Node) => {
    const matchingIdentifier = pipe(
      Option.liftPredicate(ts.isIdentifier)(node),
      Option.flatMap(symbolAt),
      Option.exists(strictEqual(symbol))
    )

    return matchingIdentifier ? count + 1 : count
  }

  return foldAst(countMatchingIdentifier)(root)(0)
}
