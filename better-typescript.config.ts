import { defineConfig, makeMergedWiring } from "@better-typescript/core/engine/wiring"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"
import { architectureExploreWiring } from "@better-typescript/checks/preset/architectureExploreWiring"
import {
  ArchitectureRolePath,
  makeFunctionalCoreEffectWiring,
  policyWithRolePrefixes
} from "@better-typescript/checks/preset/functionalCoreEffectWiring"
import { effectQualityWiring } from "@better-typescript/checks/effectQuality/wiring"

// Engine counts as domain and cli as root because wiring.ts must not look like a composition root.
const functionalCoreEffectPolicy = policyWithRolePrefixes([
  new ArchitectureRolePath({ path: "packages/core/src/engine", role: "domain" }),
  new ArchitectureRolePath({ path: "packages/cli/src", role: "root" })
])

const functionalCoreEffectWiring = makeFunctionalCoreEffectWiring(functionalCoreEffectPolicy)

// Every package dogfoods every shipped wiring. Check implementations are production code, not an
// exemption: their fixtures prove recognizers while self-hosting proves they follow the policy.
const selfHostProductFiles = ["packages/*/src/**"]
const selfHostArchitectureFiles = [
  "better-typescript.config.ts",
  ...selfHostProductFiles,
  "tests/**"
]

const standardSelfHostWiring = makeMergedWiring([defaultWiring, functionalCoreEffectWiring])

export default defineConfig([
  { files: selfHostProductFiles, wiring: standardSelfHostWiring },
  { files: selfHostProductFiles, wiring: effectQualityWiring },
  { files: selfHostArchitectureFiles, wiring: architectureExploreWiring }
])
