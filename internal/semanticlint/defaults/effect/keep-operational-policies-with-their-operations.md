---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep operational policies with their operations

Apply this policy to files that define an integration or workflow operation: an Effect that calls an external service or store, or fans out work. A file with no such operation cannot violate it.

The operation owns its timeout, retry schedule, concurrency limit, and logging: attach them in the operation's own definition, as in `const fetchProfile = (id: string) => Effect.gen(...).pipe(Effect.timeout("5 seconds"), Effect.retry(schedule))`. Report any of these shapes:

- a caller that wraps its call to the operation with `Effect.timeout`, `Effect.retry`, or a similar policy, such as `yield* fetchProfile(id).pipe(Effect.retry(schedule))`, while the operation's definition has none; this counts even when caller and operation sit in the same file;
- an operation that takes its concurrency limit, timeout, retry count, or schedule as a parameter for callers to fill in, such as `(jobs, concurrency: number) => Effect.forEach(jobs, run, { concurrency })` called as `runAll(jobs, 4)`;
- a caller that sets the span or log level for the operation's execution, such as `fetchProfile(id).pipe(Effect.withSpan(...))`, instead of the operation doing so.

Do not report policies attached inside the operation's own definition, a fixed limit chosen inside the operation, or a caller logging its own step before or after calling the operation.
