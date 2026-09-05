import * as Effect from "effect/Effect"
import * as Schedule from "effect/Schedule"

declare const task: Effect.Effect
Effect.retry(task, Schedule.forever)
Effect.retry(task, Schedule.min([Schedule.recurs(2), Schedule.exponential("1 second")]))
Effect.retry(task, { schedule: Schedule.exponential("1 second") })
Effect.retry(task, { times: 2 })
Effect.retry(task, Schedule.max([Schedule.recurs(2), Schedule.exponential("1 second")]))
Effect.retry(task, Schedule.recurs(Infinity))
Effect.retry(task, Schedule.forever.pipe(Schedule.upTo({ times: 2 })))
Effect.retry(task, Schedule.forever.pipe(Schedule.while(() => true)))
import { forever as endless } from "effect/Schedule"

Effect.retry(task, endless)
Effect.retry(task, Schedule.forever.pipe(Schedule.jittered))
Effect.retry(Schedule.exponential("1 second"))(task)
declare const custom: Schedule.Schedule
Effect.retry(task, Schedule.min([custom, Schedule.forever]))

// effect-quality-allow-unbounded-retry: process lifetime owns this reconnect loop.
Effect.retry(task, Schedule.forever)
