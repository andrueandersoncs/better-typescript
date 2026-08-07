import { Data } from "effect"
import type { Matcher } from "@better-typescript/matchers/matcher/matcherData"
import type { RefactorExampleSource } from "../example/refactorExampleSource.js"
import type { Guidance } from "./guidance.js"

// Policy is the named matching-plus-guidance unit because report owns one ordered shape.
export class Policy extends Data.Class<{
  readonly name: string
  readonly matcher: Matcher
  readonly guidance: Guidance<unknown>
  readonly reported: boolean
  readonly examples: RefactorExampleSource
}> {}
