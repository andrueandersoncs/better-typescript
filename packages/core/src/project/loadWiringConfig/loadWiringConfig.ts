import * as fs from "node:fs"
import * as path from "node:path"
import { Effect } from "effect"
import { createJiti } from "jiti"
import type { WiringConfig } from "../../engine/wiring/data.js"
import { configFileName } from "./data.js"
import { decodeWiringConfig, formatCause, projectWiringConfigError } from "./decode.js"

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

      return projectWiringConfigError(configPath, reason)
    }
  })

  return yield* decodeWiringConfig(configPath, moduleValue)
})

export const loadWiringConfig = Effect.fn("loadWiringConfig")(function* <E, R>(
  projectDirectory: string,
  fallback: Effect.Effect<WiringConfig<unknown>, E, R>
) {
  const configPath = path.resolve(projectDirectory, configFileName)
  const exists = yield* Effect.sync(() => fs.existsSync(configPath))
  const missingConfig = !exists

  if (missingConfig) {
    return yield* fallback
  }

  return yield* loadExistingWiringConfig(configPath)
})
