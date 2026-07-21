import { oneFinding } from "@better-typescript/core/engine/policy"
import type { Guidance } from "@better-typescript/core/engine/policy/data"
import {
  requireCallableRoleNameConsistencyMatcher,
  type RequireCallableRoleNameConsistencyFact
} from "@better-typescript/matchers/builtins/requireCallableRoleNameConsistency"
import { defineBuiltinPolicy } from "../definePolicy.js"

const requireCallableRoleNameConsistencyGuidance: Guidance<
  RequireCallableRoleNameConsistencyFact
> = () => (match) => {
  const { nameText, role, expected } = match.fact

  return oneFinding(
    match.target,
    `${nameText} claims the ${role} role, but does not provide ${expected}.`,
    `Rename away from the ${role} role noun, or change the signature and body so the ` +
      `${role} contract holds.`,
    match.fact
  )
}

export const requireCallableRoleNameConsistency = defineBuiltinPolicy(
  "require-callable-role-name-consistency",
  requireCallableRoleNameConsistencyMatcher,
  requireCallableRoleNameConsistencyGuidance
)
