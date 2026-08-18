import { defineConfig } from "@better-typescript/core/project/loadWiringConfig"
import { makeWiring } from "@better-typescript/core/engine/wiring/makeWiring"
import { noValueAliases } from "@better-typescript/guidance/preset/conceptAndCompositionPolicies"
import { Effect } from "effect"

export const aliasWiring = makeWiring({
  policies: [noValueAliases],
  derive: () => Effect.succeed([])
})

export const aliasConfig = defineConfig([{ files: ["src/cases.ts"], wiring: aliasWiring }])
