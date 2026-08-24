declare const Effect: { retry(a: unknown, b: unknown): unknown }
declare const Schedule: { exponential(a: string): unknown; jittered(a: unknown): unknown }
Effect.retry({}, Schedule.exponential("1 second"))
Effect.retry({}, Schedule.jittered(Schedule.exponential("1 second")))
