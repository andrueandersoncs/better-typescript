import { Effect } from "effect"

const register = Effect.sync(() => undefined)
Effect.runSync(register) // ~detect 1

const other = 1,
  task = Effect.sync(() => undefined)
Effect.runSync(task) // ~detect 1
void other

export const runNow = () => {
  const local = Effect.sync(() => "done")
  return Effect.runSync(local) // ~detect 10
}

const wrapped = (Effect.sync(() => "wrapped"))
Effect.runSync(wrapped) // ~detect 1
