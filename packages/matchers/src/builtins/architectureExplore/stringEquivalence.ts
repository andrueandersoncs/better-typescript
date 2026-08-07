import { Equivalence } from "effect"

export const stringEquivalence = Equivalence.strictEqual<string>()
