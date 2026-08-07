import type { Wiring } from "@better-typescript/core/engine/wiring/wiringClass"
import type { WiringConfig } from "@better-typescript/core/engine/wiring/wiringConfig"
import { defineConfig } from "@better-typescript/core/project/loadWiringConfig"

export const configFor = (
  wiring: Wiring,
  files: WiringConfig[number]["files"] = ["**/*"]
): WiringConfig => defineConfig([{ files, wiring }])
