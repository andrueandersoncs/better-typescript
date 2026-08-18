import { validatePolicyNames } from "./duplicatePolicyNames.js"
import { Wiring } from "./wiringClass.js"

// Validation runs at construction because duplicate names must fail before analysis starts.
export const makeWiring = <E>(definition: Pick<Wiring<E>, "policies" | "derive">): Wiring<E> => {
  const wiring = new Wiring<E>(definition)

  return validatePolicyNames(wiring.policies, wiring)
}
