import type { ViolationTarget } from "./violationTarget.js"
import { Data } from "effect"

// Match is a factual observation because user-facing prose belongs to direct rule output.
export class Match<Fact> extends Data.Class<{
  readonly target: ViolationTarget
  readonly fact: Fact
}> {}
