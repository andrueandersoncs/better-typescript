import * as Effect from "effect/Effect"
import * as Schedule from "effect/Schedule"

declare const task: Effect.Effect
Effect.retry(task, Schedule.exponential("1 second"))
Effect.retry(task, Schedule.jittered(Schedule.exponential("1 second")))
const unrelated = Schedule.jittered(Schedule.exponential("1 second"))
Effect.retry(task, Schedule.fibonacci("1 second"))
Effect.retry(task, Schedule.max([Schedule.jittered(Schedule.exponential("1 second")), Schedule.fixed("1 second")]))
Effect.retry(task, { schedule: Schedule.exponential("1 second") })
Effect.retry(task, { times: 2 })
void unrelated
Effect.retry(Schedule.exponential("1 second"))(task)
Effect.retry(task, Schedule.exponential("1 second").pipe(Schedule.passthrough))
