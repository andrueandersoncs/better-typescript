import { defineConfig, makeMergedWiring } from "@better-typescript/core/engine/wiring"
import { defaultWiring } from "@better-typescript/guidance/preset/defaultWiring"
import { architectureExploreWiring } from "@better-typescript/guidance/preset/architectureExploreWiring"
import { ArchitectureRolePath } from "@better-typescript/guidance/architectureRole"
import { policyWithRolePrefixes } from "@better-typescript/matchers/builtins/functionalCoreEffect/policy"
import { makeFunctionalCoreEffectWiring } from "@better-typescript/guidance/preset/functionalCoreEffectWiring"
import { effectQualityWiring } from "@better-typescript/guidance/preset/effectQualityWiring"

// Engine counts as domain and cli as root because wiring.ts must not look like a composition root.
const functionalCoreEffectPolicy = policyWithRolePrefixes([
  new ArchitectureRolePath({ path: "packages/core/src/engine", role: "domain" }),
  new ArchitectureRolePath({ path: "packages/cli/src", role: "root" })
])

const functionalCoreEffectWiring = makeFunctionalCoreEffectWiring(functionalCoreEffectPolicy)

// Every package dogfoods every shipped wiring. Policy implementations are production code, not an
// exemption: their fixtures prove recognizers while self-hosting proves they follow the policy.
const selfHostProductFiles = ["packages/*/src/**"] as const
const selfHostArchitectureFiles = [
  "better-typescript.config.ts",
  ...selfHostProductFiles,
  "tests/**"
] as const

const standardSelfHostWiring = makeMergedWiring([defaultWiring, functionalCoreEffectWiring])

export default defineConfig([
  { files: selfHostProductFiles, wiring: standardSelfHostWiring },
  { files: selfHostProductFiles, wiring: effectQualityWiring },
  { files: selfHostArchitectureFiles, wiring: architectureExploreWiring }
])
