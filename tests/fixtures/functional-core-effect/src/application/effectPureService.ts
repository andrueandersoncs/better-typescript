import { Effect } from "effect"

export class EffectPureService extends Effect.Service<EffectPureService>()(
  "EffectPureService",
  {
    effect: Effect.succeed({
      normalize: (input: string): string => input.trim()
    })
  }
) {}

export class ScopedPolicy extends Effect.Service<ScopedPolicy>()(
  "ScopedPolicy",
  {
    scoped: Effect.gen(function* () {
      yield* Effect.addFinalizer(() => Effect.void)

      return {
        normalize: (input: string): string => input.trim()
      }
    })
  }
) {}
