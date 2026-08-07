import { HashMap, Option, pipe } from "effect"
import type * as ts from "typescript"
import { referenceKey } from "../../support/referenceKey.js"
import type { ExportUsage } from "./exportUsage.js"
import { makeEmptyUsage } from "./makeEmptyUsage.js"

export const usageForSymbol =
  (usages: HashMap.HashMap<string, ExportUsage>) =>
  (symbol: ts.Symbol): ExportUsage => {
    const key = referenceKey(symbol)
    const usage = HashMap.get(usages, key)

    return pipe(usage, Option.getOrElse(makeEmptyUsage))
  }
