import { Effect } from "effect"
import { ProjectWiringConfigError } from "./projectWiringConfigError.js"

export const failConfig = Effect.fn("WiringConfig.failConfig")(function* (
  configPath: string,
  reason: string
) {
  const error = new ProjectWiringConfigError({ configPath, reason })

  return yield* Effect.fail(error)
})
