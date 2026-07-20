import { Equivalence } from "effect"

export const strictEqual = <A, B>(left: A, right: B): boolean =>
  Equivalence.strictEqual<A | B>()(left, right)
