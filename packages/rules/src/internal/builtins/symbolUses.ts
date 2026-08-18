import type { HashMap } from "effect"
import type * as ts from "typescript"
import type { ReferenceKey } from "../support/referenceKeyType.js"
import type { SymbolUse } from "./symbolUse.js"

// SymbolUses is shared uses-map values because its owners need one vocabulary.
export type SymbolUses = HashMap.HashMap<ReferenceKey<ts.Symbol>, SymbolUse>
