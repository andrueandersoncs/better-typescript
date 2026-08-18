import { makeMergedWiring } from "@better-typescript/core/engine/wiring/makeMergedWiring"
import { defineConfig } from "@better-typescript/core/project/loadWiringConfig"
import { architectureExploreWiring } from "@better-typescript/guidance/architectureExplore/architectureExploreWiring"
import { effectQualityWiring } from "@better-typescript/guidance/effectQuality/advice"
import { functionalCoreEffectWiring } from "@better-typescript/guidance/functionalCoreEffect/advice"
import { defaultWiring } from "@better-typescript/guidance/preset/defaultWiring"

const productFiles = ["packages/*/src/**"] as const
const architectureFiles = ["better-typescript.config.ts", ...productFiles, "tests/**"] as const

const productWiring = makeMergedWiring([
  defaultWiring,
  functionalCoreEffectWiring,
  effectQualityWiring
])

export default defineConfig([
  { files: productFiles, wiring: productWiring },
  { files: architectureFiles, wiring: architectureExploreWiring }
])
