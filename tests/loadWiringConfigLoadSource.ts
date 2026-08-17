import { Effect } from "effect"
import { loadWiringConfig } from "@better-typescript/core/project/loadWiringConfig"
import { fallbackConfig } from "./loadWiringConfigFallback.js"
import { writeConfig } from "./loadWiringConfigWriteConfig.js"

export const loadSource = async (projectDirectory: string, source: string) => {
  await writeConfig(projectDirectory, source)

  return Effect.runPromise(loadWiringConfig(projectDirectory, fallbackConfig))
}
