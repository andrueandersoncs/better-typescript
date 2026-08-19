import { Function, HashMap, Option, pipe } from "effect"
import type * as ts from "typescript"
import { referenceKey } from "../../support/referenceKey.js"
import type { ReferenceKey } from "../../support/referenceKeyType.js"
import type { DataStructureEntry } from "./conceptIndex.js"
import { canonicalSymbol } from "../../support/canonicalSymbol.js"

export const modelFromResolvedType =
  (checker: ts.TypeChecker) =>
  (dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>) =>
  (type: ts.Type): Option.Option<DataStructureEntry> => {
    const alias = Option.fromNullishOr(type.aliasSymbol)
    const symbol = type.getSymbol()
    const symbolOption = Option.fromNullishOr(symbol)

    return pipe(
      alias,
      Option.orElse(Function.constant(symbolOption)),
      Option.map(canonicalSymbol(checker)),
      Option.flatMap((candidate) => {
        const candidateKey = referenceKey(candidate)

        return HashMap.get(dataBySymbol, candidateKey)
      })
    )
  }
