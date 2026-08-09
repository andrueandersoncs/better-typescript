import { defineConfig } from "@better-typescript/core/project/loadWiringConfig"
import { selfHostProductFiles } from "./selfHostFiles.js"
import { standardSelfHostWiring } from "./selfHostWiring.js"

export default defineConfig([{ files: selfHostProductFiles, wiring: standardSelfHostWiring }])
