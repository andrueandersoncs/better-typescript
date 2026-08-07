import { defineConfig } from "@better-typescript/core/project/loadWiringConfig"
import { probeWiring } from "./watchThrowProbeWiring.js"

export const probeConfig = defineConfig([{ files: ["src/cases.ts"], wiring: probeWiring }])
