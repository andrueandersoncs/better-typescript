declare const Effect: any; declare const Schedule: any; declare const task: any;
Effect.retry(task, Schedule.forever)
Effect.retry(task, Schedule.recurs(3))
Effect.retry(task, { ["metadata"]: true, times: 3 })
