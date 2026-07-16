import { Match, pipe } from "effect"

declare const status: "active" | "inactive" | "unknown"
declare const handleActive: () => string
declare const handleInactive: () => string
declare const handleUnknown: () => string

export const describeStatus = (): string =>
  pipe(
    Match.value(status),
    Match.when("active", handleActive),
    Match.when("inactive", handleInactive),
    Match.when("unknown", handleUnknown),
    Match.exhaustive
  )
