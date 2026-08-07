import { Effect } from "effect"
import { ProjectWiringConfigError } from "@better-typescript/core/project/loadWiringConfig/projectWiringConfigError"
import { loadWiringConfig } from "@better-typescript/core/project/loadWiringConfig"
import { fallbackConfig } from "./loadWiringConfigFallback.js"

export const loadConfigFailure = (projectDirectory: string): Promise<ProjectWiringConfigError> =>
  Effect.runPromise(Effect.flip(loadWiringConfig(projectDirectory, fallbackConfig)))
