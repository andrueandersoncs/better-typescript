import { Effect } from "effect"

export const loadEffect = () => Effect.succeed("loaded")

type SyncLoader = () => string

export const syncAdapter: SyncLoader = () => Effect.runSync(Effect.succeed("loaded"))

export const inspectExit = () => Effect.runSyncExit(Effect.succeed("loaded"))

export const loadWithSetup = () => {
  const effect = Effect.succeed("loaded")
  return Effect.runSync(effect)
}

const LocalEffect = {
  runSync: <A>(value: A): A => value
}

export const loadLocalValue = () => LocalEffect.runSync("loaded")

export const loadedValues = [Effect.succeed("loaded")].map((effect) =>
  Effect.runSync(effect)
)
