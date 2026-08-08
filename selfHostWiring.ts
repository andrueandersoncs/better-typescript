import { makeMergedWiring } from "@better-typescript/core/engine/wiring/makeMergedWiring"
import { defaultWiring } from "@better-typescript/guidance/preset/defaultWiring"
import { policyWithRolePrefixes } from "@better-typescript/matchers/builtins/functionalCoreEffect/functionalCoreEffectPolicyDefaults"
import { ArchitectureRolePath } from "@better-typescript/matchers/support/architectureRolePath"
import { makeFunctionalCoreEffectWiring } from "@better-typescript/guidance/functionalCoreEffect/advice"
import { architectureExploreDerive } from "@better-typescript/guidance/architectureExplore/architectureExploreDerive"
import { effectQualityDerive } from "@better-typescript/guidance/effectQuality/advice"

// Derive seams own their adviser catalogs because self-host must not re-register each leaf.
void architectureExploreDerive
void effectQualityDerive

// Engine counts as domain and cli as root because wiring.ts must not look like a composition root.
const functionalCoreEffectPolicy = policyWithRolePrefixes([
  new ArchitectureRolePath({ path: "packages/core/src/engine", role: "domain" }),
  new ArchitectureRolePath({ path: "packages/cli/src", role: "root" })
])

const functionalCoreEffectWiring = makeFunctionalCoreEffectWiring(functionalCoreEffectPolicy)

export const standardSelfHostWiring = makeMergedWiring([defaultWiring, functionalCoreEffectWiring])
