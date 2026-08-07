import type { Guidance } from "./guidance.js"
import type { PolicyDefinition } from "./policyDefinition.js"

// PolicySeed is the typed authoring input because guidance specializes PolicyDefinition.guidance.
export type PolicySeed<Fact> = Omit<PolicyDefinition, "guidance"> & {
  readonly guidance: Guidance<Fact>
}
