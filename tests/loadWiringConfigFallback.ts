import { defineConfig } from "@better-typescript/core/project/loadWiringConfig"
import { makeWiring } from "@better-typescript/core/engine/wiring/makeWiring"
import type { Wiring } from "@better-typescript/core/engine/wiring/wiringClass"
import type { WiringConfig } from "@better-typescript/core/engine/wiring/wiringConfig"
import { Effect } from "effect"

export const fallbackWiring: Wiring = makeWiring({
  policies: [],
  derive: () => Effect.succeed([])
})

export const fallbackConfig: WiringConfig = defineConfig([
  { files: ["**/*"], wiring: fallbackWiring }
])
