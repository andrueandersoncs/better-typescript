import { Equivalence } from "effect"
import type * as ts from "typescript"

export const nodeEquivalence = Equivalence.strictEqual<ts.Node>()
