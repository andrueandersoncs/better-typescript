import { HashMap, Iterable, MutableList, Option, pipe } from "effect"
import * as ts from "typescript"
import { astNodesIn } from "../sources/astNodesIn.js"
import { referenceKey } from "../support/referenceKey.js"
import type { ReferenceKey } from "../support/referenceKeyType.js"
import { SymbolReference } from "./symbolReference.js"
import { symbolOptionAt } from "./symbolOptionAt.js"

const makeSymbolReference = (symbol: ts.Symbol) => {
  const key = referenceKey(symbol)

  return new SymbolReference({ key, symbol })
}

export const symbolReferencesIn = (checker: ts.TypeChecker) => (root: ts.Node) => {
  const seen = pipe(HashMap.empty<ReferenceKey, true>(), HashMap.beginMutation)
  const references = MutableList.make<SymbolReference>()
  const nodes = astNodesIn(root)

  Iterable.forEach(nodes, (node) => {
    if (!ts.isIdentifier(node)) {
      return
    }

    const maybeSymbol = symbolOptionAt(checker)(node)

    if (Option.isNone(maybeSymbol)) {
      return
    }

    const reference = makeSymbolReference(maybeSymbol.value)

    if (HashMap.has(seen, reference.key)) {
      return
    }

    HashMap.set(seen, reference.key, true)
    MutableList.append(references, reference)
  })

  return MutableList.toArray(references)
}
