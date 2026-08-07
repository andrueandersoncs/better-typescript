import { validatePolicyNames } from "./duplicatePolicyNames.js"
import { Wiring } from "./wiringClass.js"

// Validation runs at construction because duplicate names must fail before analysis starts.
export const makeWiring = (definition: Pick<Wiring, "policies" | "derive">) => {
  const wiring = new Wiring(definition)

  return validatePolicyNames(wiring.policies, wiring)
}
