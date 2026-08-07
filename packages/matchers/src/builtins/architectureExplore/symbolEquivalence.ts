import { Equivalence } from "effect"
import type * as ts from "typescript"

export const symbolEquivalence = Equivalence.strictEqual<ts.Symbol>()
