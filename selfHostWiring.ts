import { Array, Function, pipe } from "effect"
import type { Advice } from "@better-typescript/core/engine/derive/advice"
import { makeWiring } from "@better-typescript/core/engine/wiring/makeWiring"
import { effectQualityWiring } from "@better-typescript/guidance/effectQuality/advice"
import { defaultPolicyCatalog } from "@better-typescript/guidance/preset/defaultWiring"
import { policyWithRolePrefixes } from "@better-typescript/matchers/builtins/functionalCoreEffect/functionalCoreEffectPolicyDefaults"
import { ArchitectureRolePath } from "@better-typescript/matchers/support/architectureRolePath"
import { makeFunctionalCoreEffectWiring } from "@better-typescript/guidance/functionalCoreEffect/advice"

const noDerivedAdvice = Function.constant(Array.empty<Advice>())
// Engine counts as domain and cli as root because wiring.ts must not look like a composition root.
const functionalCoreEffectPolicy = policyWithRolePrefixes([
  new ArchitectureRolePath({ path: "packages/core/src/engine", role: "domain" }),
  new ArchitectureRolePath({ path: "packages/cli/src", role: "root" })
])

const functionalCoreEffectWiring = makeFunctionalCoreEffectWiring(functionalCoreEffectPolicy)

export const standardSelfHostWiring = makeWiring({
  policies: pipe(
    defaultPolicyCatalog,
    Array.appendAll(functionalCoreEffectWiring.policies),
    Array.appendAll(effectQualityWiring.policies),
    Array.filter((policy) => policy.reported)
  ),
  derive: noDerivedAdvice
})
