import { retry as retriable, type Effect } from "effect/Effect"
import { jittered, exponential } from "effect/Schedule"

declare const task: Effect
retriable(task, jittered(exponential("1 second")))

const Effect = { retry: (_task: unknown, _policy: unknown): unknown => undefined }
const Schedule = { exponential: (_duration: string): unknown => ({}) }
Effect.retry(task, Schedule.exponential("1 second"))
