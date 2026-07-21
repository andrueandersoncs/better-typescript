import { oneFinding } from "@better-typescript/core/engine/policy"
import type { Guidance } from "@better-typescript/core/engine/policy/data"
import {
  noNestedCallsMatcher,
  type NoNestedCallsFact
} from "@better-typescript/matchers/builtins/noNestedCalls"
import { defineBuiltinPolicy } from "../definePolicy.js"

const ruleHint =
  "A call whose result feeds another call hides a sequence of steps in one expression " +
  "that reads inside-out. Declare the inner result as a const (or a yield* step in a " +
  "gen block) and pass the name, or restructure data-last so the value flows through " +
  "pipe. Calls that return functions stay inline: currying and pipe stages read " +
  "left-to-right."

const noNestedCallsGuidance: Guidance<NoNestedCallsFact> = () => (match) =>
  oneFinding(
    match.target,
    `Avoid computing ${match.fact.callText} inline in the arguments of ${match.fact.consumerText}.`,
    ruleHint,
    match.fact
  )

export const noNestedCalls = defineBuiltinPolicy(
  "no-nested-calls",
  noNestedCallsMatcher,
  noNestedCallsGuidance
)
