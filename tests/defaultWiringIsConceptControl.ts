import { Equivalence, flow } from "effect"
import { policyName } from "./defaultWiringPolicyName.js"

const strictStringEqual = Equivalence.strictEqual<string>()
const conceptControlNameMatches = (name: string) => strictStringEqual(name, "concept-control")

export const isConceptControl = flow(policyName, conceptControlNameMatches)
