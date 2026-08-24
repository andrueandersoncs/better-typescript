import { Effect } from "effect"
declare const operation: Effect.Effect<string, never>
Effect.catchCause(operation, () => Effect.succeed("fallback"))
