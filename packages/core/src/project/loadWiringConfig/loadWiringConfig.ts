import * as fs from "node:fs"
import * as path from "node:path"
import { Effect } from "effect"
import { createJiti } from "jiti"
import type { WiringConfig } from "../../engine/wiring/data.js"
import { configFileName } from "./data.js"
import type { ProjectWiringConfigError } from "./data.js"
import { decodeWiringConfig, formatCause, makeProjectWiringConfigError } from "./decode.js"

const loadExistingWiringConfig = Effect.fn("loadExistingWiringConfig")(function* (
  configPath: string
) {
  const moduleValue = yield* Effect.tryPromise({
    try: () => {
      const jiti = createJiti(import.meta.url)

      return jiti.import(configPath)
    },
    catch: (cause) => {
      const causeMessage = formatCause(cause)
      const reason = `failed to load config module: ${causeMessage}`

      return makeProjectWiringConfigError(configPath, reason)
    }
  })

  return yield* decodeWiringConfig(configPath, moduleValue)
})

export const loadWiringConfig: (
  projectDirectory: string,
  fallback: WiringConfig<unknown>
) => Effect.Effect<WiringConfig<unknown>, ProjectWiringConfigError> = Effect.fn("loadWiringConfig")(
  function* (projectDirectory: string, fallback: WiringConfig<unknown>) {
    const configPath = path.resolve(projectDirectory, configFileName)
    const exists = yield* Effect.sync(() => fs.existsSync(configPath))
    const missingConfig = !exists

    if (missingConfig) {
      return fallback
    }

    return yield* loadExistingWiringConfig(configPath)
  }
)
