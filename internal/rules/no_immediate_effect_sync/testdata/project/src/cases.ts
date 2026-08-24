import { Effect } from "effect"
const task = Effect.sync(() => 1)
Effect.runSync(task)
const deferred = Effect.sync(() => 2)
void deferred
