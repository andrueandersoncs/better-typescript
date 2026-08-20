import { Effect } from "effect"

export const deferred = Effect.sync(() => undefined)
export const composed = Effect.flatMap(deferred, () => Effect.void)

const retained = Effect.sync(() => undefined)
Effect.runSync(retained)
export const retainedWorkflow = Effect.andThen(retained, Effect.void)
