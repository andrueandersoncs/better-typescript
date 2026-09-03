# PersistedRef object factory

- ID: 008
- Added: 2026-09-03
- Source: paste
- Path: none

## Why it is bad

the thing I don't like about this is that its clearly a constructable data structure and yet it's not implemented as a class inheriting from Schema.Class() with a static make() method override like it should be

## Code

````ts
import { Effect, Function, pipe, SynchronizedRef } from "effect"

/**
 *
 * Scope: public
 *
 * When to use: One database-backed value must serialize fallible writes because
 * local fibers share its cache.
 *
 * Example:
 * ```ts
 * import { Effect } from "effect"
 * import { PersistedRef } from "effect-domains/persisted-ref"
 *
 * const program = PersistedRef.make({ commit: (_previous: number, next: number) => Effect.succeed(next), load: Effect.succeed(0) })
 * ```
 *
 */
export const PersistedRef = {
  make: <
    A,
    CommitError,
    CommitRequirements,
    LoadError,
    LoadRequirements,
  >(
    options: Readonly<{
      commit: (
        previous: A,
        next: A,
      ) => Effect.Effect<A, CommitError, CommitRequirements>
      load: Effect.Effect<A, LoadError, LoadRequirements>
    }>,
  ) =>
    Effect.fn("PersistedRef.make")(function* () {
      const initial = yield* options.load
      const backing = yield* SynchronizedRef.make(initial)
      const get = SynchronizedRef.get(backing)

      const refresh = SynchronizedRef.updateAndGetEffect(
        backing,
        Function.constant(options.load),
      )

      const set = (value: A) => pipe(
        SynchronizedRef.updateAndGetEffect(
          backing,
          (previous) => options.commit(previous, value),
        ),
        Effect.uninterruptible,
      )

      const commitUpdate = (f: (current: A) => A) => (previous: A) =>
        options.commit(previous, f(previous))

      const update = (f: (current: A) => A) => pipe(
        SynchronizedRef.updateAndGetEffect(backing, commitUpdate(f)),
        Effect.uninterruptible,
      )

      const modify = <B>(
        f: (current: A) => readonly [result: B, next: A],
      ) => pipe(
        SynchronizedRef.modifyEffect(backing, (previous) => {
          const [result, next] = f(previous)

          return pipe(
            options.commit(previous, next),
            Effect.map((persisted) => [result, persisted] as const),
          )
        }),
        Effect.uninterruptible,
      )

      return { get, refresh, set, update, modify }
    })(),
}
````

## Analysis

### Shape: constructable runtime record object

- Observable shape: An exported object literal exposes a `make` factory whose implementation constructs and returns a reusable stateful record of callable operations instead of a class extending `Schema.Class`.
- Existing rules: `prefer-effect-schema-class` and `prefer-effect-schema-constructor` explicitly allow runtime records with callable properties; `no-first-party-root-class` applies only after a class exists.
- Pattern: [constructable-runtime-record-object](../patterns/constructable-runtime-record-object.md)
- Emergence: new-prospective
- Reason: The exported factory and constructed record are stable AST shapes, the checker can identify their callable members, and the requested `Schema.Class` replacement is actionable. No built-in rule owns this stricter preference.
