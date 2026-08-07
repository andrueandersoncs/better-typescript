import { Function } from "effect"
import type { Guidance } from "./guidance.js"
import { asTypedMatch } from "./asTypedMatch.js"

export const widenGuidance =
  <Fact>(guidance: Guidance<Fact>): Guidance<unknown> =>
  (context) =>
    Function.compose(asTypedMatch<Fact>, guidance(context))
