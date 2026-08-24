import { Effect } from "effect"
declare const operation: unknown
Effect.catchAll(operation, () => Effect.fail(new Error("failed")))
