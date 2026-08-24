import { Effect } from "effect"
type Failure = { readonly _tag: "Failure" }
declare const operation: Effect.Effect<string, Failure>
Effect.catchCause(operation, () => Effect.succeed("fallback"))
