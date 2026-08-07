import { Option } from "effect"
import { Policy } from "./policyClass.js"
import type { PolicySeed } from "./policySeed.js"
import { examplesFromDefinition } from "../example/examplesFromDefinition.js"
import { widenGuidance } from "./widenGuidance.js"

export const makeSilentPolicy = <Fact, Seed extends PolicySeed<Fact> = PolicySeed<Fact>>(
  definition: Seed
): Policy => {
  const maybeExamples = Option.fromNullishOr(definition.examples)
  const examples = examplesFromDefinition(maybeExamples)

  return new Policy({
    name: definition.name,
    matcher: definition.matcher,
    guidance: widenGuidance(definition.guidance),
    examples,
    reported: false
  })
}
