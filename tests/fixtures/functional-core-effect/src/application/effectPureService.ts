import { Context, Effect } from "effect"

export class EffectPureService extends Context.Service<EffectPureService>()(
  "EffectPureService",
  {
    make: Effect.succeed({
      normalize: (input: string): string => input.trim()
    })
  }
) {}

export class ScopedPolicy extends Context.Service<ScopedPolicy>()(
  "ScopedPolicy",
  {
    make: Effect.gen(function* () {
      yield* Effect.addFinalizer(() => Effect.void)

      return {
        normalize: (input: string): string => input.trim()
      }
    })
  }
) {}
