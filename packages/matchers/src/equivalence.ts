import { Equivalence } from "effect"

export const strictEqual =
  <A>(left: A) =>
  <B>(right: B): boolean =>
    Equivalence.strictEqual<A | B>()(left, right)
