import { Equivalence } from "effect"

const strictStringEqual = Equivalence.strictEqual<string>()

export const sameName = (left: string) => (right: string) => strictStringEqual(left, right)
