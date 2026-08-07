import { Effect } from "effect"
import { ProjectWiringConfigError } from "@better-typescript/core/project/loadWiringConfig/projectWiringConfigError"
import { decodeWiringConfig } from "@better-typescript/core/project/loadWiringConfig"
import { virtualConfigPath } from "./loadWiringConfigVirtualConfigPath.js"

export const decodeFailure = (moduleValue: unknown): Promise<ProjectWiringConfigError> =>
  Effect.runPromise(Effect.flip(decodeWiringConfig(virtualConfigPath, moduleValue)))
