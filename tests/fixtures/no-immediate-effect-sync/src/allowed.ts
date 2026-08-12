import { Effect } from "effect"

export const deferred = Effect.sync(() => undefined)
export const composed = Effect.flatMap(deferred, () => Effect.void)
