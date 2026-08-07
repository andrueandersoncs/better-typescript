import { Data, HashMap } from "effect"
import type { ReferenceKey } from "../../support/referenceKeyType.js"
import { ExportedSymbolEntry } from "./exportedSymbolEntry.js"
import { ExportUsage } from "./exportUsage.js"

// Generalized exports have their own index because home-file references are excluded.
export class ExportSymbolIndex extends Data.Class<{
  readonly entries: ReadonlyArray<ExportedSymbolEntry>
  readonly usages: HashMap.HashMap<ReferenceKey<import("typescript").Symbol>, ExportUsage>
}> {}
