import { Effect } from "effect"

const register = Effect.sync(() => undefined)
Effect.runSync(register) // ~detect
