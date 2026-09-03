# DispatchQueue service contract

- ID: 004
- Added: 2026-09-02
- Source: paste
- Path: none

## Why it is bad

unspecified

## Code

```ts
export class DispatchQueue extends Context.Service<DispatchQueue, {
  readonly queue: PersistedQueue.PersistedQueue<Schema.Schema.Type<typeof DispatchSchema>>;
  readonly queueTask: (taskId: string) => Effect.Effect<UnifiedTask, unknown>;
  readonly reconcile: Effect.Effect<number, unknown>;
  readonly pauseTask: (taskId: string) => Effect.Effect<Task, unknown>;
  readonly checkpointPausedTask: (taskId: string, workerId: string, runToken: string) => Effect.Effect<Task, unknown>;
  readonly resumeTask: (taskId: string) => Effect.Effect<Task, unknown>;
  readonly cancelTask: (taskId: string) => Effect.Effect<Task, unknown>;
  readonly interruptTask: (taskId: string, workerId: string, runToken: string) => Effect.Effect<Task, unknown>;
  readonly finishTask: (
    taskId: string,
    workerId: string,
    succeeded: boolean,
    error: string | null,
    runToken: string,
  ) => Effect.Effect<Task, unknown>;
}>()(
  "task-based-pi/DispatchQueue",
) {
```

## Analysis

### Shape: Unknown Effect service error channels

- Observable shape: Eight operations in a `Context.Service` contract expose `unknown` as the `Effect.Effect` error type.
- Existing rules: `no-error-type` allows `unknown` at untyped boundaries; `typed-error-recovery` checks recovery calls. Neither owns service contract error types.
- Pattern: [unknown-effect-service-error](../patterns/unknown-effect-service-error.md)
- Emergence: attached
- Reason: The existing pattern owns this reusable typed-boundary shape and its specific-error or `never` replacement.

### Shape: Large inline Context.Service shape

- Observable shape: The second `Context.Service` type argument is an inline type literal with nine members.
- Existing rules: `prefer-context-service-class` requires the class form and `no-raw-object-types` checks function parameters and returns; neither limits this type literal.
- Pattern: none
- Emergence: no-pattern
- Reason: The operations are cohesive, Effect documents the inline service interface form, and one example does not establish a non-arbitrary size boundary. A named shape would move the same contract without improving its design.
