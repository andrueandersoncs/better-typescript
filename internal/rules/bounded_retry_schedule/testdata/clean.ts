import { retry as retriable, type Effect } from "effect/Effect"
import { recurs } from "effect/Schedule"

declare const task: Effect
retriable(task, recurs(3))

const Effect = { retry: (_task: unknown, _policy: unknown): unknown => undefined }
const Schedule = { forever: {} }
Effect.retry(task, Schedule.forever)
