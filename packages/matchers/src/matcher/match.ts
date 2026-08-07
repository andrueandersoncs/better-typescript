import type { Target } from "./workspaceTarget.js"
import { Data } from "effect"

// Match is a factual observation because user-facing prose belongs to core Guidance.
export class Match<Fact> extends Data.Class<{
  readonly target: Target
  readonly fact: Fact
}> {}
